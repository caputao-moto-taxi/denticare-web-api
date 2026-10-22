import { AuthenticatedRequest } from '../../../auth-user';
import { IAuthRepository } from '../../../domain/auth.repository';

export type LogoutInput = {
  userId: string;
  authToken: AuthenticatedRequest['authToken'];
};

export class LogoutUseCase {
  constructor(private readonly repository: IAuthRepository) {}

  execute({ userId, authToken }: LogoutInput) {
    return this.repository.logout(
      userId,
      authToken.jti,
      authToken.expiresAt,
      authToken.sessionId,
    );
  }
}
