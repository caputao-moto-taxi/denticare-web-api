import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { SendMailServiceUseCase } from '../../../../shared/infra/services/sendEmailNotification.service';
import { ReadHTMLFile } from '../../../../shared/helpers/utils';
import { IAuthRepository } from '../../../domain/auth.repository';
import { Logger } from '@nestjs/common';
import { replaceAuthActionToken } from '../shared/auth-action-token';

const PASSWORD_RESET_TOKEN_TTL_MILLISECONDS = 60 * 60 * 1000;

export class RequestPasswordResetUseCase {
  private readonly logger = new Logger(RequestPasswordResetUseCase.name);

  constructor(
    private readonly repository: IAuthRepository,
    private readonly sendMailService: SendMailServiceUseCase,
  ) {}

  async execute(email: string) {
    const response = {
      message: 'If the account exists, a recovery link has been sent.',
    };
    const account = await this.repository.findUserByEmail(
      email.trim().toLowerCase(),
    );
    if (
      !account ||
      account.deletedAt ||
      !account.isActive ||
      !account.isEmailVerified
    ) {
      return response;
    }

    const token = await replaceAuthActionToken(
      this.repository,
      account.id,
      'PASSWORD_RESET',
      PASSWORD_RESET_TOKEN_TTL_MILLISECONDS,
    );

    try {
      const templatePath = [
        join(__dirname, '../../../../../public/password-reset.html'),
        join(__dirname, '../../../../public/password-reset.html'),
      ].find(existsSync);

      const resetUrl = new URL(
        '/auth/forgot-password/recover-password',
        (process.env.FRONTEND_URL || 'http://localhost:5173').replace(
          /\/$/,
          '',
        ),
      );
      resetUrl.searchParams.set('token', token);

      const subject = 'Recuperação da palavra-passe DentCare';
      const html = await ReadHTMLFile(templatePath, {
        displayName: `${account.Person[0].firstName} ${account.Person[0].lastName}`,
        resetUrl: resetUrl.toString(),
        year: new Date().getFullYear(),
      });

      const result = await this.sendMailService.execute({
        to: account.email,
        subject,
        html,
      });

      if (result !== true) {
        this.logger.warn('Password reset email delivery failed');
      }
    } catch {
      this.logger.warn('Password reset email delivery failed');
    }
    return response;
  }
}
