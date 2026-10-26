import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import twilio from 'twilio';
import { AuthEmailService } from '../auth/domain/auth-email.service';
import { GetEnviromentVariable } from '../shared/infra/azure';
import { CommunicationDeliveryGateway } from './application/communication-delivery.gateway';
import {
  isValidCommunicationContact,
  normalizeCommunicationContact,
  toE164,
} from './domain/communication-contact';

@Injectable()
export class CommunicationDeliveryService extends CommunicationDeliveryGateway {
  private readonly logger = new Logger(CommunicationDeliveryService.name);
  private smsClient: ReturnType<typeof twilio> | null = null;
  private smsSender: string | null = null;

  constructor(private readonly emailService: AuthEmailService) {
    super();
  }

  override;
  async sendEmail(recipients: string[], subject: string, body: string) {
    await this.emailService.sendCampaignEmail(recipients, subject, body);
  }

  override async sendSmsBatch(recipients: string[], body: string) {
    await this.ensureSmsClient();

    const results = await Promise.allSettled(
      recipients.map((to) =>
        this.smsClient!.messages.create({
          body,
          from: this.smsSender!,
          to,
        }),
      ),
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') return true;
      const reason =
        result.reason instanceof Error
          ? result.reason.message
          : String(result.reason);
      this.logger.warn(
        `Campaign SMS failed for recipient ${index + 1}/${recipients.length}: ${reason}`,
      );
      return false;
    });
  }

  static isValidContact(channel: 'EMAIL' | 'SMS', value: string | null) {
    return isValidCommunicationContact(channel, value);
  }

  static normalizeContact(channel: 'EMAIL' | 'SMS', value: string) {
    return normalizeCommunicationContact(channel, value);
  }

  static toE164(value: string) {
    return toE164(value);
  }

  private async ensureSmsClient() {
    if (this.smsClient && this.smsSender) return;

    const [accountSid, authToken, sender] = await Promise.all([
      this.readSecret('TWILIO_ACCOUNT_SID'),
      this.readSecret('TWILIO_AUTH_TOKEN'),
      this.readSecret('TWILIO_PHONE_NUMBER', 'TWILIO_FROM_NUMBER'),
    ]);

    if (!accountSid || !authToken || !sender) {
      throw new ServiceUnavailableException('SMS delivery is not configured');
    }

    this.smsClient = twilio(accountSid, authToken);
    this.smsSender = sender;
  }

  private async readSecret(name: string, alias?: string) {
    const local =
      process.env[name]?.trim() || (alias && process.env[alias]?.trim());
    if (local) return local;
    try {
      const value = await GetEnviromentVariable(name);
      if (value?.trim()) return value.trim();
    } catch {
      if (!alias) return '';
    }
    if (!alias) return '';
    try {
      const value = await GetEnviromentVariable(alias);
      return value?.trim() || '';
    } catch {
      return '';
    }
  }
}
