import { createHash, randomBytes } from 'crypto';
import {
  AuthActionTokenData,
  AuthActionTokenType,
  IAuthRepository,
} from '../../../domain/auth.repository';

export function hashAuthActionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function generateAuthActionToken() {
  const token = randomBytes(32).toString('base64url');
  return { token, tokenHash: hashAuthActionToken(token) };
}

export async function replaceAuthActionToken(
  repository: IAuthRepository,
  userId: string,
  type: AuthActionTokenType,
  ttlMilliseconds: number,
): Promise<string> {
  const now = new Date();
  const generated = generateAuthActionToken();
  const data: AuthActionTokenData = {
    userId,
    type,
    tokenHash: generated.tokenHash,
    expiresAt: new Date(now.getTime() + ttlMilliseconds),
  };

  await repository.transaction(async (transaction) => {
    await transaction.markUnusedAuthActionTokensUsed(userId, type, now);
    await transaction.createAuthActionToken(data);
  });

  return generated.token;
}
