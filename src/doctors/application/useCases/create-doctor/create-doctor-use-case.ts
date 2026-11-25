import { randomBytes } from 'node:crypto';
import { ConflictException } from '@nestjs/common';
import { AuthUser } from '../../../../auth/auth-user';
import { IHashService } from '../../../../shared/application/interfaces/IHash';
import {
  DoctorCreateCommand,
  IDoctorRepository,
} from '../../../domain/doctor.repository';
import { DoctorManagementPolicy } from '../../doctor-management.policy';

export type CreateDoctorInput = {
  user: AuthUser;
  doctor: Omit<
    DoctorCreateCommand,
    'firstName' | 'lastName' | 'passwordHash'
  > & { name: string };
};

export class CreateDoctorUseCase {
  constructor(
    private readonly repository: IDoctorRepository,
    private readonly hashService: IHashService,
  ) {}

  async execute({ user, doctor }: CreateDoctorInput) {
    DoctorManagementPolicy.ensureCanCreate(user);
    const email = doctor.email.trim().toLowerCase();
    if (await this.repository.emailExists(email)) {
      throw new ConflictException('An account with this email already exists');
    }
    const { name, ...doctorData } = doctor;
    const [firstName, ...nameParts] = name
      .trim()
      .replace(/\s+/g, ' ')
      .split(' ');
    const passwordHash = await this.hashService.hashPassword(
      randomBytes(32).toString('hex'),
    );
    return this.repository.create(user.branchId, {
      ...doctorData,
      firstName,
      lastName: nameParts.join(' ') || firstName,
      email,
      ...(doctor.phone !== undefined && { phone: doctor.phone.trim() }),
      address: doctor.address.trim(),
      passwordHash,
    });
  }
}
