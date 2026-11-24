import { AuthenticatedRequest } from '../../../auth-user';
import { IAuthRepository } from '../../../domain/auth.repository';

export type LogoutInput = {
  userId: string;
  authToken: AuthenticatedRequest['authToken'];
};

export class LogoutUseCase {
  constructor(private readonly repository: IAuthRepository) {}

  execute({ userId, authToken }: LogoutInput) {
    const now = new Date();
    return this.repository.transaction(async (transaction) => {
      await transaction.createRevokedToken(authToken.jti, authToken.expiresAt);
      if (authToken.sessionId) {
        await transaction.revokeRefreshSession(
          authToken.sessionId,
          userId,
          now,
        );
      }
    });
  }
}
