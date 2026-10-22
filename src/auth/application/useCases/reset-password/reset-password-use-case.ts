import { IAuthRepository } from '../../../domain/auth.repository';

export type ResetPasswordInput = {
  token: string;
  password: string;
};

export class ResetPasswordUseCase {
  constructor(private readonly repository: IAuthRepository) {}

  execute(input: ResetPasswordInput) {
    return this.repository.resetPassword(input.token, input.password);
  }
}
