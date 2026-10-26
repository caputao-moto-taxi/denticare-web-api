import { CampaignChannel } from './communications.types';

export function isValidCommunicationContact(
  channel: CampaignChannel,
  value: string | null,
) {
  const contact = value?.trim();
  if (!contact) return false;
  if (channel === 'EMAIL') return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact);
  return toE164(contact) !== null;
}

export function normalizeCommunicationContact(
  channel: CampaignChannel,
  value: string,
) {
  if (channel === 'EMAIL') return value.trim();
  return toE164(value) ?? value.trim();
}

export function toE164(value: string) {
  const compact = value.trim().replace(/[\s().-]/g, '');
  if (/^\+[1-9]\d{7,14}$/.test(compact)) return compact;

  const digits = compact.replace(/\D/g, '');
  if (digits.startsWith('244') && digits.length >= 12 && digits.length <= 13) {
    return `+${digits}`;
  }
  if (/^9\d{8}$/.test(digits)) return `+244${digits}`;
  return null;
}
