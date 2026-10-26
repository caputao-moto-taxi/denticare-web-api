import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import twilio = require('twilio');
import { AuthEmailService } from '../auth/domain/auth-email.service';
import { GetEnviromentVariable } from '../shared/infra/azure';

type CampaignChannel = 'EMAIL' | 'SMS';

@Injectable()
export class CommunicationDeliveryService {
  private readonly logger = new Logger(CommunicationDeliveryService.name);
  private smsClient: ReturnType<typeof twilio> | null = null;
  private smsSender: string | null = null;

  constructor(private readonly emailService: AuthEmailService) {}

  async sendEmail(recipients: string[], subject: string, body: string) {
    await this.emailService.sendCampaignEmail(recipients, subject, body);
  }

  async sendSmsBatch(recipients: string[], body: string) {
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

  static isValidContact(channel: CampaignChannel, value: string | null) {
    const contact = value?.trim();
    if (!contact) return false;
    if (channel === 'EMAIL') {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact);
    }
    return CommunicationDeliveryService.toE164(contact) !== null;
  }

  static normalizeContact(channel: CampaignChannel, value: string) {
    if (channel === 'EMAIL') return value.trim();
    return CommunicationDeliveryService.toE164(value) ?? value.trim();
  }

  static toE164(value: string) {
    const compact = value.trim().replace(/[\s().-]/g, '');
    if (/^\+[1-9]\d{7,14}$/.test(compact)) return compact;

    const digits = compact.replace(/\D/g, '');
    if (digits.startsWith('244') && digits.length >= 12 && digits.length <= 13) {
      return `+${digits}`;
    }
    if (/^9\d{8}$/.test(digits)) {
      return `+244${digits}`;
    }
    return null;
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
