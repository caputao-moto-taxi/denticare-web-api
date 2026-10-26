import { Injectable, NotFoundException } from '@nestjs/common';
import { AuthUser } from '../../../../auth/auth-user';
import { CommunicationsRepository } from '../../../domain/communications.repository';
import { requirePatientAccount } from '../../campaign-access.policy';

@Injectable()
export class GetPatientMarketingConsentUseCase {
  constructor(private readonly repository: CommunicationsRepository) {}

  async execute(user: AuthUser) {
    const patient = await this.repository.findPatientConsent(
      user.id,
      requirePatientAccount(user),
    );
    if (!patient) throw new NotFoundException('Patient profile not found');
    return {
      marketingEmailConsent: patient.marketingEmailConsent,
      marketingEmailConsentUpdatedAt: patient.marketingEmailConsentUpdatedAt,
      marketingSmsConsent: patient.marketingSmsConsent,
      marketingSmsConsentUpdatedAt: patient.marketingSmsConsentUpdatedAt,
    };
  }
}
