import { randomUUID } from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { AuthProfileRecord } from '../../../domain/auth.repository';
import { toPublicAuthProfile } from './auth-profile';

export const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;

export async function createAuthTokenPair(
  jwtService: JwtService,
  user: AuthProfileRecord,
  sessionId: string,
  refreshTokenSecret: string,
) {
  const role = user.Role?.slug ?? 'staff';
  const accessToken = await jwtService.signAsync({
    sub: user.id,
    email: user.email,
    role,
    branchId: user.branchId ?? '',
    jti: randomUUID(),
    sid: sessionId,
  });
  const refreshToken = await jwtService.signAsync(
    { sub: user.id, jti: sessionId, type: 'refresh' },
    {
      secret: refreshTokenSecret,
      expiresIn: REFRESH_TOKEN_TTL_SECONDS,
    },
  );

  return {
    accessToken,
    refreshToken,
    user: toPublicAuthProfile(user),
  };
}
