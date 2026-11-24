import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { AuthUser } from '../../../../auth/auth-user';
import { IAppointmentRepository } from '../../../domain/appointment.repository';
import {
  findScopedAppointment,
  requireAppointmentAccess,
  toAppointment,
} from '../shared/appointment-rules';

export type CompleteAppointmentInput = { user: AuthUser; id: string };

export class CompleteAppointmentUseCase {
  constructor(private readonly repository: IAppointmentRepository) {}

  async execute({ user, id }: CompleteAppointmentInput) {
    if (!['admin', 'doctor'].includes(user.role)) {
      throw new ForbiddenException(
        'Only admins and doctors can complete appointments',
      );
    }
    const appointment = await findScopedAppointment(this.repository, user, id);
    requireAppointmentAccess(user, appointment);
    if (appointment.status !== 'CONFIRMED') {
      throw new BadRequestException(
        'Only confirmed appointments can be completed',
      );
    }
    return toAppointment(
      await this.repository.updateAppointment(id, { status: 'COMPLETED' }),
    );
  }
}
