import { AuthUser } from '../../../../auth/auth-user';
import { ConflictException } from '@nestjs/common';
import {
  IPatientRepository,
  PatientUpdateCommand,
} from '../../../domain/patient.repository';
import { splitName } from '../../../../shared/helpers/staff';
import { normalizePatientUpdateCommand } from '../../patient-profile.normalizer';

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
    return this.repository.update(user, id, {
      ...changesWithoutName,
      ...nameParts,
    });
  }
}
