import { AuthEmailService } from '../../../domain/auth-email.service';
import { IAuthRepository } from '../../../domain/auth.repository';

export class ResendActivationUseCase {
  constructor(
    private readonly repository: IAuthRepository,
    private readonly emailService: AuthEmailService,
  ) {}

  async execute(email: string) {
    this.emailService.assertConfigured();
    const request = await this.repository.createActivationRequest(email);
    if (request) await this.emailService.sendActivationEmail(request);
    return {
      message: 'If the account needs activation, an email has been sent.',
    };
  }
}
