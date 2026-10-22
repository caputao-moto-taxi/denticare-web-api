import { IAuthRepository, LoginCommand } from '../../../domain/auth.repository';

export type LoginInput = { input: LoginCommand };

export class LoginUseCase {
  constructor(private readonly repository: IAuthRepository) {}

  execute({ input }: LoginInput) {
    return this.repository.login(input);
  }
}
