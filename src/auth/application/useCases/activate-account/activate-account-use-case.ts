import { BadRequestException, Logger } from '@nestjs/common';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { addCalendarMonthsUtc } from '../../../../plans/domain/subscription-pricing';
import { ReadHTMLFile } from '../../../../shared/helpers/utils';
import { SendMailServiceUseCase } from '../../../../shared/infra/services/sendEmailNotification.service';
import { IAuthRepository } from '../../../domain/auth.repository';
import { getAuthAccountDisplayName } from '../shared/auth-profile';
import { hashAuthActionToken } from '../shared/auth-action-token';

const ACTIVE_SUBSCRIPTION_STATUSES = [
  'TRIAL_ACTIVE',
  'ACTIVE',
  'EXPIRING_SOON',
] as const;

export class ActivateAccountUseCase {
  private readonly logger = new Logger(ActivateAccountUseCase.name);

  constructor(
    private readonly repository: IAuthRepository,
    private readonly sendMailService: SendMailServiceUseCase,
  ) {}

  async execute(token: string) {
    const now = new Date();
    const action = await this.repository.findAuthActionToken(
      hashAuthActionToken(token),
    );
    if (
      !action ||
      action.type !== 'ACTIVATION' ||
      action.usedAt ||
      action.expiresAt <= now
    ) {
      throw new BadRequestException('Invalid or expired activation link');
    }

    await this.repository.transaction(async (transaction) => {
      const claimed = await transaction.claimAuthActionToken(action.id, now);
      if (claimed !== 1) {
        throw new BadRequestException('Invalid or expired activation link');
      }

      await transaction.activateUser(action.userId);
      const headquarterId = await transaction.findClinicHeadquarterId(
        action.userId,
      );
      if (headquarterId) {
        const hasSubscription = await transaction.hasClinicSubscription(
          headquarterId,
          [...ACTIVE_SUBSCRIPTION_STATUSES],
        );
        if (!hasSubscription) {
          await transaction.createClinicSubscription({
            headquarterId,
            status: 'TRIAL_ACTIVE',
            startsAt: now,
            expiresAt: addCalendarMonthsUtc(now, 1),
          });
        }
      }

      await transaction.markUnusedAuthActionTokensUsed(
        action.userId,
        'ACTIVATION',
        now,
      );
    });

    try {
      const account = await this.repository.findUserProfile(action.userId);
      if (!account) {
        this.logger.warn(
          'Welcome email skipped because the activated account was not found',
        );
        return;
      }

      const templatePath = [
        join(__dirname, '../../../../../public/welcome-email.html'),
        join(__dirname, '../../../../public/welcome-email.html'),
      ].find(existsSync);
      if (!templatePath) {
        throw new Error('Welcome email template not found');
      }

      const subject = 'Bem-vindo à DentCare';
      const html = await ReadHTMLFile(templatePath, {
        displayName: getAuthAccountDisplayName(account.Person),
        year: new Date().getFullYear(),
      });
      const result = await this.sendMailService.execute({
        to: account.email,
        subject,
        html,
      });

      if (result !== true) {
        this.logger.warn(
          'Welcome email delivery failed after account activation',
        );
      }
    } catch (error) {
      this.logger.warn(
        `Welcome email delivery failed after account activation: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
