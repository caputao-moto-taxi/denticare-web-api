import { randomBytes } from 'node:crypto';
import { AuthUser } from '../../../../auth/auth-user';
import { IHashService } from '../../../../shared/application/interfaces/IHash';
import {
  DoctorCreateCommand,
  IDoctorRepository,
} from '../../../domain/doctor.repository';
import { DoctorManagementPolicy } from '../../doctor-management.policy';

export type CreateDoctorInput = {
  user: AuthUser;
  doctor: Omit<DoctorCreateCommand, 'passwordHash'>;
};

export class CreateDoctorUseCase {
  constructor(
    private readonly repository: IDoctorRepository,
    private readonly hashService: IHashService,
  ) {}

  async execute({ user, doctor }: CreateDoctorInput) {
    DoctorManagementPolicy.ensureCanCreate(user);
    const passwordHash = await this.hashService.hashPassword(
      randomBytes(32).toString('hex'),
    );
    return this.repository.create(user, { ...doctor, passwordHash });
  }
}
