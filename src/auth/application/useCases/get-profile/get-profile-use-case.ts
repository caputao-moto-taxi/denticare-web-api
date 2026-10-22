import { AuthUser } from '../../../auth-user';
import { IAuthRepository } from '../../../domain/auth.repository';

export type GetProfileInput = { user: AuthUser };

export class GetProfileUseCase {
  constructor(private readonly repository: IAuthRepository) {}

  execute({ user }: GetProfileInput) {
    return this.repository.getProfile(user);
  }
}
