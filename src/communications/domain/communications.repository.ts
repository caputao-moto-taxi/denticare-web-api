import {
  CampaignAudiencePatient,
  CampaignChannel,
  CampaignRecipient,
  CampaignStatus,
  CampaignSummary,
  PatientMarketingConsent,
  UpdateMarketingConsentCommand,
} from './communications.types';

export abstract class CommunicationsRepository {
  abstract listCampaigns(branchId: string): Promise<CampaignSummary[]>;
  abstract listAudience(
    branchId: string,
    channel: CampaignChannel,
    search?: string,
  ): Promise<CampaignAudiencePatient[]>;
  abstract findCampaignRecipients(
    branchId: string,
    channel: CampaignChannel,
    recipientIds: string[],
  ): Promise<CampaignRecipient[]>;
  abstract createCampaign(input: {
    branchId: string;
    createdById: string;
    name: string;
    channel: CampaignChannel;
    subject: string | null;
    body: string;
    recipientCount: number;
  }): Promise<{ id: string }>;
  abstract updateCampaignResult(
    id: string,
    result: {
      sentCount: number;
      failedCount: number;
      status: CampaignStatus;
      sentAt: Date | null;
    },
  ): Promise<CampaignSummary>;
  abstract findPatientConsent(
    userId: string,
    branchId: string,
  ): Promise<PatientMarketingConsent | null>;
  abstract updatePatientConsent(
    id: string,
    input: UpdateMarketingConsentCommand,
  ): Promise<Omit<PatientMarketingConsent, 'id'>>;
}
