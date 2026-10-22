import { AuthEmailService } from '../../../domain/auth-email.service';
import { IAuthRepository } from '../../../domain/auth.repository';

export class RequestPasswordResetUseCase {
  constructor(
    private readonly repository: IAuthRepository,
    private readonly emailService: AuthEmailService,
  ) { }

  async execute(email: string) {
    this.emailService.assertConfigured();
    const request = await this.repository.createPasswordResetRequest(email);
    if (request) {
      await this.emailService.sendPasswordResetEmail(request);
    };
    return { message: 'If the account exists, a recovery link has been sent.' };
  }
}
