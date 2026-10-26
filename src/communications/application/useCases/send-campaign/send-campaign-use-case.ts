import { BadRequestException, Injectable } from '@nestjs/common';
import { AuthUser } from '../../../../auth/auth-user';
import { CommunicationDeliveryGateway } from '../../communication-delivery.gateway';
import {
  isValidCommunicationContact,
  normalizeCommunicationContact,
} from '../../../domain/communication-contact';
import { CommunicationsRepository } from '../../../domain/communications.repository';
import {
  CampaignDeliveryRecipient,
  SendCampaignCommand,
} from '../../../domain/communications.types';
import { requireCampaignAdmin } from '../../campaign-access.policy';

const MAX_RECIPIENTS = 250;
const SMS_BATCH_SIZE = 10;

@Injectable()
export class SendCampaignUseCase {
  constructor(
    private readonly repository: CommunicationsRepository,
    private readonly delivery: CommunicationDeliveryGateway,
  ) {}

  async execute(user: AuthUser, input: SendCampaignCommand) {
    const branchId = requireCampaignAdmin(user);
    if (input.channel === 'EMAIL' && !input.subject?.trim()) {
      throw new BadRequestException('An email subject is required');
    }
    if (input.recipientIds.length > MAX_RECIPIENTS) {
      throw new BadRequestException(
        `A campaign cannot contain more than ${MAX_RECIPIENTS} recipients`,
      );
    }

    const recipientIds = [...new Set(input.recipientIds)];
    if (recipientIds.length !== input.recipientIds.length) {
      throw new BadRequestException('Duplicate recipients are not allowed');
    }

    const patients = await this.repository.findCampaignRecipients(
      branchId,
      input.channel,
      recipientIds,
    );
    const recipients = patients.flatMap((patient) => {
      const rawContact =
        input.channel === 'EMAIL' ? patient.email : patient.phoneNumber;
      if (!isValidCommunicationContact(input.channel, rawContact)) return [];
      return [
        {
          id: patient.id,
          contact: normalizeCommunicationContact(input.channel, rawContact!),
        },
      ];
    });

    if (recipients.length !== recipientIds.length) {
      throw new BadRequestException(
        'Some selected patients no longer consent to this channel or have no valid contact',
      );
    }

    const subject = input.channel === 'EMAIL' ? input.subject!.trim() : null;
    const body = input.body.trim();
    const campaign = await this.repository.createCampaign({
      branchId,
      createdById: user.id,
      name: input.name.trim(),
      channel: input.channel,
      subject,
      body,
      recipientCount: recipients.length,
    });

    const counts = await this.deliver(input.channel, recipients, subject, body);
    const status =
      counts.sentCount === 0
        ? 'FAILED'
        : counts.failedCount > 0
          ? 'PARTIAL'
          : 'SENT';
    return this.repository.updateCampaignResult(campaign.id, {
      ...counts,
      status,
      sentAt: counts.sentCount > 0 ? new Date() : null,
    });
  }

  private async deliver(
    channel: SendCampaignCommand['channel'],
    recipients: CampaignDeliveryRecipient[],
    subject: string | null,
    body: string,
  ) {
    let sentCount = 0;
    let failedCount = 0;
    if (channel === 'EMAIL') {
      try {
        await this.delivery.sendEmail(
          recipients.map(({ contact }) => contact),
          subject!,
          body,
        );
        sentCount = recipients.length;
      } catch {
        failedCount = recipients.length;
      }
      return { sentCount, failedCount };
    }

    for (let index = 0; index < recipients.length; index += SMS_BATCH_SIZE) {
      const batch = recipients.slice(index, index + SMS_BATCH_SIZE);
      try {
        const results = await this.delivery.sendSmsBatch(
          batch.map(({ contact }) => contact),
          body,
        );
        sentCount += results.filter(Boolean).length;
        failedCount += results.filter((success) => !success).length;
      } catch {
        failedCount += batch.length;
      }
    }
    return { sentCount, failedCount };
  }
}
