export type CampaignChannel = 'EMAIL' | 'SMS';
export type CampaignStatus = 'FAILED' | 'PARTIAL' | 'SENT';

export type SendCampaignCommand = {
  name: string;
  channel: CampaignChannel;
  subject?: string;
  body: string;
  recipientIds: string[];
};

export type CampaignSummary = {
  id: string;
  name: string;
  channel: string;
  subject: string | null;
  status: string;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  sentAt: Date | null;
  createdAt: Date;
};

export type CampaignAudiencePatient = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phoneNumber: string | null;
};

export type CampaignRecipient = Pick<
  CampaignAudiencePatient,
  'id' | 'email' | 'phoneNumber'
>;
export type CampaignDeliveryRecipient = { id: string; contact: string };

export type PatientMarketingConsent = {
  id: string;
  marketingEmailConsent: boolean;
  marketingEmailConsentUpdatedAt: Date | null;
  marketingSmsConsent: boolean;
  marketingSmsConsentUpdatedAt: Date | null;
};

export type UpdateMarketingConsentCommand = {
  marketingEmailConsent: boolean;
  marketingEmailConsentUpdatedAt: Date | null;
  marketingSmsConsent: boolean;
  marketingSmsConsentUpdatedAt: Date | null;
};
