import { AuthUser } from '../../../../auth/auth-user';
import { ConflictException } from '@nestjs/common';
import {
  IPatientRepository,
  PatientCreateCommand,
} from '../../../domain/patient.repository';
import { splitName } from '../../../../shared/helpers/staff';
import { normalizePatientCreateCommand } from '../../patient-profile.normalizer';
import { requirePatientStaff } from '../../patient-access.policy';

export type CreatePatientInput = {
  user: AuthUser;
  patient: PatientCreateCommand;
};

export class CreatePatientUseCase {
  constructor(private readonly repository: IPatientRepository) {}

  async execute({ user, patient }: CreatePatientInput) {
    requirePatientStaff(user);
    const normalizedPatient = normalizePatientCreateCommand(patient);
    const email = normalizedPatient.email;
    if (email && (await this.repository.emailExists(email))) {
      throw new ConflictException('A patient with this email already exists');
    }
    const { name, ...changes } = normalizedPatient;
    const { firstName, lastName } = splitName(name);
    return this.repository.create(user, { ...changes, firstName, lastName });
  }
}
