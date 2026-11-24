import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import {
  IAuthRepository,
  RefreshCommand,
} from '../../../domain/auth.repository';
import {
  createAuthTokenPair,
  REFRESH_TOKEN_TTL_SECONDS,
} from '../shared/auth-session';

export type RefreshInput = { input: RefreshCommand };

type RefreshTokenPayload = {
  sub?: string;
  jti?: string;
  type?: string;
};

export class RefreshUseCase {
  constructor(
    private readonly repository: IAuthRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async execute({ input }: RefreshInput) {
    const refreshTokenSecret =
      this.configService.getOrThrow<string>('JWT_REFRESH_SECRET');
    let payload: RefreshTokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(
        input.refreshToken,
        { secret: refreshTokenSecret },
      );
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (!payload.sub || !payload.jti || payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const now = new Date();
    const currentSession = await this.repository.findRefreshSession(
      payload.jti,
    );
    if (
      !currentSession ||
      currentSession.userId !== payload.sub ||
      currentSession.revokedAt ||
      currentSession.expiresAt <= now
    ) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.repository.findUserProfile(payload.sub);
    if (!user || user.deletedAt || !user.isActive) {
      throw new UnauthorizedException('User account is unavailable');
    }

    const sessionId = randomUUID();
    const expiresAt = new Date(
      now.getTime() + REFRESH_TOKEN_TTL_SECONDS * 1000,
    );
    const tokens = await createAuthTokenPair(
      this.jwtService,
      user,
      sessionId,
      refreshTokenSecret,
    );
    const rotated = await this.repository.transaction(async (transaction) => {
      const claimed = await transaction.claimRefreshSession(
        currentSession.jti,
        user.id,
        now,
      );
      if (claimed !== 1) return false;

      await transaction.createRefreshSession({
        jti: sessionId,
        userId: user.id,
        expiresAt,
      });
      return true;
    });

    if (!rotated) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    return tokens;
  }
}
