import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import { IHashService } from '../../../../shared/application/interfaces/IHash';
import { IAuthRepository, LoginCommand } from '../../../domain/auth.repository';
import {
  createAuthTokenPair,
  REFRESH_TOKEN_TTL_SECONDS,
} from '../shared/auth-session';

export type LoginInput = { input: LoginCommand };

export class LoginUseCase {
  constructor(
    private readonly repository: IAuthRepository,
    private readonly hashService: IHashService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async execute({ input }: LoginInput) {
    const email = input.email.trim().toLowerCase();
    const user = await this.repository.findUserForLogin(email);
    if (!user || user.deletedAt) {
      throw new UnauthorizedException('Invalid email or password');
    }
    if (!user.isActive) {
      throw new UnauthorizedException('User account is not active');
    }
    if (!(await this.hashService.compare(input.password, user.password))) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (
      user.Role?.slug !== 'platform_owner' &&
      (!user.branch ||
        user.branch.deletedAt ||
        user.branch.headquarter.deletedAt ||
        !user.branch.headquarter.isActive)
    ) {
      throw new UnauthorizedException('Clinic account is unavailable');
    }

    const sessionId = randomUUID();
    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + REFRESH_TOKEN_TTL_SECONDS * 1000,
    );
    const tokens = await createAuthTokenPair(
      this.jwtService,
      user,
      sessionId,
      this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
    );

    await this.repository.createRefreshSession({
      jti: sessionId,
      userId: user.id,
      expiresAt,
    });

    return tokens;
  }
}
