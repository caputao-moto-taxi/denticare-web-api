import { Injectable } from '@nestjs/common';
import { AuthUser } from '../../../../auth/auth-user';
import {
  isValidCommunicationContact,
  normalizeCommunicationContact,
} from '../../../domain/communication-contact';
import { CampaignChannel } from '../../../domain/communications.types';
import { CommunicationsRepository } from '../../../domain/communications.repository';
import { requireCampaignAdmin } from '../../campaign-access.policy';

@Injectable()
export class ListCampaignAudienceUseCase {
  constructor(private readonly repository: CommunicationsRepository) {}

  async execute(user: AuthUser, channel: CampaignChannel, search?: string) {
    const patients = await this.repository.listAudience(
      requireCampaignAdmin(user),
      channel,
      search?.trim() || undefined,
    );

    return patients.flatMap((patient) => {
      const rawContact =
        channel === 'EMAIL' ? patient.email : patient.phoneNumber;
      if (!isValidCommunicationContact(channel, rawContact)) return [];
      return [
        {
          id: patient.id,
          name: `${patient.firstName} ${patient.lastName}`.trim(),
          contact: normalizeCommunicationContact(channel, rawContact!),
        },
      ];
    });
  }
}
