import { AuthUser } from '../../../../auth/auth-user';
import { ConflictException } from '@nestjs/common';
import {
  DoctorUpdateCommand,
  IDoctorRepository,
} from '../../../domain/doctor.repository';
import { DoctorManagementPolicy } from '../../doctor-management.policy';

export type UpdateDoctorInput = {
  user: AuthUser;
  id: string;
  changes: Omit<DoctorUpdateCommand, 'firstName' | 'lastName'> & {
    name?: string;
  };
};

export class UpdateDoctorUseCase {
  constructor(private readonly repository: IDoctorRepository) {}

  async execute({ user, id, changes }: UpdateDoctorInput) {
    DoctorManagementPolicy.ensureCanUpdate(user, id);
    const email = changes.email?.trim().toLowerCase();
    if (email && (await this.repository.emailExists(email, id))) {
      throw new ConflictException('An account with this email already exists');
    }
    const { name, ...profileChanges } = changes;
    const nameParts = name
      ? name.trim().replace(/\s+/g, ' ').split(' ')
      : undefined;
    return this.repository.update(user.branchId, id, {
      ...profileChanges,
      ...(email !== undefined && { email }),
      ...(nameParts && {
        firstName: nameParts[0],
        lastName: nameParts.slice(1).join(' ') || nameParts[0],
      }),
      ...(changes.phone !== undefined && { phone: changes.phone.trim() }),
      ...(changes.address !== undefined && {
        address: changes.address.trim(),
      }),
    });
  }
}
