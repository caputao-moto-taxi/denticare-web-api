import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import * as twilio from 'twilio';
import { AuthEmailService } from '../auth/domain/auth-email.service';

type CampaignChannel = 'EMAIL' | 'SMS';

@Injectable()
export class CommunicationDeliveryService {
  private smsClient: ReturnType<typeof twilio> | null = null;
  private smsSender: string | null = null;

  constructor(private readonly emailService: AuthEmailService) {}

  async sendEmail(recipients: string[], subject: string, body: string) {
    await this.emailService.sendCampaignEmail(recipients, subject, body);
  }

  async sendSmsBatch(recipients: string[], body: string) {
    if (!this.smsClient || !this.smsSender) {
      const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER } =
        process.env;
      if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_NUMBER) {
        throw new ServiceUnavailableException('SMS delivery is not configured');
      }
      const accountSid = TWILIO_ACCOUNT_SID;
      const authToken = TWILIO_AUTH_TOKEN;
      const sender = TWILIO_FROM_NUMBER;
      this.smsClient = twilio(accountSid, authToken);
      this.smsSender = sender;
    }

    const results = await Promise.allSettled(
      recipients.map((to) =>
        this.smsClient!.messages.create({
          body,
          from: this.smsSender!,
          to,
        }),
      ),
    );
    return results.map((result) => result.status === 'fulfilled');
  }

  static isValidContact(channel: CampaignChannel, value: string | null) {
    const contact = value?.trim();
    if (!contact) return false;
    if (channel === 'EMAIL') {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact);
    }
    return /^\+[1-9]\d{7,14}$/.test(contact.replace(/[\s().-]/g, ''));
  }

  static normalizeContact(channel: CampaignChannel, value: string) {
    return channel === 'EMAIL'
      ? value.trim()
      : value.trim().replace(/[\s().-]/g, '');
  }
}
