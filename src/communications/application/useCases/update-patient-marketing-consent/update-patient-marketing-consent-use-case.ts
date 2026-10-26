import { Injectable, NotFoundException } from '@nestjs/common';
import { AuthUser } from '../../../../auth/auth-user';
import { CommunicationsRepository } from '../../../domain/communications.repository';
import { requirePatientAccount } from '../../campaign-access.policy';

@Injectable()
export class UpdatePatientMarketingConsentUseCase {
  constructor(private readonly repository: CommunicationsRepository) {}

  async execute(
    user: AuthUser,
    input: { marketingEmailConsent: boolean; marketingSmsConsent: boolean },
  ) {
    const patient = await this.repository.findPatientConsent(
      user.id,
      requirePatientAccount(user),
    );
    if (!patient) throw new NotFoundException('Patient profile not found');

    const changedAt = new Date();
    return this.repository.updatePatientConsent(patient.id, {
      marketingEmailConsent: input.marketingEmailConsent,
      marketingEmailConsentUpdatedAt:
        input.marketingEmailConsent !== patient.marketingEmailConsent
          ? changedAt
          : patient.marketingEmailConsentUpdatedAt,
      marketingSmsConsent: input.marketingSmsConsent,
      marketingSmsConsentUpdatedAt:
        input.marketingSmsConsent !== patient.marketingSmsConsent
          ? changedAt
          : patient.marketingSmsConsentUpdatedAt,
    });
  }
}
