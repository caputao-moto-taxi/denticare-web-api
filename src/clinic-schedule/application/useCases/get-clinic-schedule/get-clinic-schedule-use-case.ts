import { NotFoundException } from '@nestjs/common';
import { AuthUser } from '../../../../auth/auth-user';
import { IClinicScheduleRepository } from '../../../domain/clinic-schedule.repository';
import { toClinicScheduleView } from '../shared/clinic-schedule-view';

export type GetClinicScheduleInput = { user: AuthUser };

export class GetClinicScheduleUseCase {
  constructor(private readonly repository: IClinicScheduleRepository) {}

  async execute({ user }: GetClinicScheduleInput) {
    const branch = await this.repository.findById(user.branchId);
    if (!branch || branch.deletedAt) {
      throw new NotFoundException('Branch not found');
    }
    return toClinicScheduleView(branch);
  }
}
