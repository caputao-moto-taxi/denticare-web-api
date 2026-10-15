import { AuthenticatedRequest, AuthUser } from '../../auth-user';
import {
  IAuthRepository,
  LoginCommand,
  RegisterCommand,
  UpdateProfileCommand,
} from '../../domain/auth.repository';

export class AuthUseCases {
  constructor(private readonly authRepository: IAuthRepository) {}

  register(input: RegisterCommand) {
    return this.authRepository.register(input);
  }

  login(input: LoginCommand) {
    return this.authRepository.login(input);
  }

  getProfile(user: AuthUser) {
    return this.authRepository.getProfile(user);
  }

  updateProfile(user: AuthUser, input: UpdateProfileCommand) {
    return this.authRepository.updateProfile(user, input);
  }

  logout(userId: string, request: AuthenticatedRequest['authToken']) {
    return this.authRepository.logout(userId, request.jti, request.expiresAt);
  }
}
