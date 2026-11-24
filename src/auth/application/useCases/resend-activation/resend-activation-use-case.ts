import { Logger } from '@nestjs/common';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { SendMailServiceUseCase } from '../../../../shared/infra/services/sendEmailNotification.service';
import { ReadHTMLFile } from '../../../../shared/helpers/utils';
import { IAuthRepository } from '../../../domain/auth.repository';
import { getAuthAccountDisplayName } from '../shared/auth-profile';
import { replaceAuthActionToken } from '../shared/auth-action-token';

const ACTIVATION_TOKEN_TTL_MILLISECONDS = 24 * 60 * 60 * 1000;

export class ResendActivationUseCase {
  private readonly logger = new Logger(ResendActivationUseCase.name);

  constructor(
    private readonly repository: IAuthRepository,
    private readonly sendMailService: SendMailServiceUseCase,
  ) {}

  async execute(email: string) {
    const account = await this.repository.findUserByEmail(
      email.trim().toLowerCase(),
    );
    if (
      account &&
      !account.deletedAt &&
      !account.isActive &&
      !account.isEmailVerified
    ) {
      const token = await replaceAuthActionToken(
        this.repository,
        account.id,
        'ACTIVATION',
        ACTIVATION_TOKEN_TTL_MILLISECONDS,
      );

      try {
        const templatePath = [
          join(__dirname, '../../../../../public/activation-email.html'),
          join(__dirname, '../../../../public/activation-email.html'),
        ].find(existsSync);

        if (!templatePath) {
          throw new Error('Activation email template not found');
        }

        const activationUrl = new URL(
          '/auth/activate',
          (process.env.FRONTEND_URL || 'http://localhost:5173').replace(
            /\/$/,
            '',
          ),
        );
        activationUrl.searchParams.set('token', token);

        const subject = 'Ative a sua conta DentCare';
        const html = await ReadHTMLFile(templatePath, {
          displayName: getAuthAccountDisplayName(account.Person),
          activationUrl: activationUrl.toString(),
          year: new Date().getFullYear(),
        });

        const result = await this.sendMailService.execute({
          to: account.email,
          subject,
          html,
        });

        if (result !== true) {
          this.logger.warn('Activation email delivery failed');
        }
      } catch (error) {
        this.logger.warn(
          `Activation email delivery failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    return {
      message: 'If the account needs activation, an email has been sent.',
    };
  }
}
