import { AuthUser } from '../../../auth-user';
import {
  IAuthRepository,
  UpdateProfileCommand,
} from '../../../domain/auth.repository';

export type UpdateProfileInput = {
  user: AuthUser;
  input: UpdateProfileCommand;
};

export class UpdateProfileUseCase {
  constructor(private readonly repository: IAuthRepository) {}

  execute({ user, input }: UpdateProfileInput) {
    return this.repository.updateProfile(user, input);
  }
}
