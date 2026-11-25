import { AuthUser } from '../../../../auth/auth-user';
import { ConflictException } from '@nestjs/common';
import {
  IPatientRepository,
  PatientUpdateCommand,
} from '../../../domain/patient.repository';
import { splitName } from '../../../../shared/helpers/staff';
import { normalizePatientUpdateCommand } from '../../patient-profile.normalizer';
import { consentTimestamps } from '../../patient-consent.policy';

export type UpdatePatientInput = {
  user: AuthUser;
  id: string;
  changes: PatientUpdateCommand;
};

export class UpdatePatientUseCase {
  constructor(private readonly repository: IPatientRepository) {}

  async execute({ user, id, changes }: UpdatePatientInput) {
    const normalizedChanges = normalizePatientUpdateCommand(changes);
    const email = normalizedChanges.email;
    if (email && (await this.repository.emailExists(email, id))) {
      throw new ConflictException('A patient with this email already exists');
    }
    const { name, ...changesWithoutName } = normalizedChanges;
    const nameParts = name === undefined ? {} : splitName(name);
    const consentChanges = {
      ...(normalizedChanges.dataProcessingConsent !== undefined && {
        dataProcessingConsent: normalizedChanges.dataProcessingConsent,
      }),
      ...(normalizedChanges.marketingEmailConsent !== undefined && {
        marketingEmailConsent: normalizedChanges.marketingEmailConsent,
      }),
      ...(normalizedChanges.marketingSmsConsent !== undefined && {
        marketingSmsConsent: normalizedChanges.marketingSmsConsent,
      }),
    };
    const timestamps = Object.keys(consentChanges).length
      ? consentTimestamps(
          consentChanges,
          await this.repository.getConsentState(user, id),
        )
      : {};
    return this.repository.update(user, id, {
      ...changesWithoutName,
      ...nameParts,
      ...timestamps,
    });
  }
}
