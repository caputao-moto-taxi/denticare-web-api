import { IAuthRepository } from '../../../domain/auth.repository';

export class ActivateAccountUseCase {
  constructor(private readonly repository: IAuthRepository) {}

  execute(token: string) {
    return this.repository.activateAccount(token);
  }
}
