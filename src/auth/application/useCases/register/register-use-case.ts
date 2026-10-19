import { Logger } from '@nestjs/common';
import {
  RegisterCommand,
  IAuthRepository,
} from '../../../domain/auth.repository';
import { AuthEmailService } from '../../../domain/auth-email.service';

export type RegisterInput = { input: RegisterCommand };

export class RegisterUseCase {
  private readonly logger = new Logger(RegisterUseCase.name);

  constructor(
    private readonly repository: IAuthRepository,
    private readonly emailService: AuthEmailService,
  ) {}

  async execute({ input }: RegisterInput) {
    this.emailService.assertConfigured();
    const activation = await this.repository.register(input);
    let emailSent = true;
    try {
      await this.emailService.sendActivationEmail(activation);
    } catch {
      emailSent = false;
      this.logger.warn('Activation email delivery failed after registration');
    }
    return { message: 'Check your email to activate your account.', emailSent };
  }
}
