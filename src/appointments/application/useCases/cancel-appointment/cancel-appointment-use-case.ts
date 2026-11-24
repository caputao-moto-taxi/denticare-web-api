import { BadRequestException } from '@nestjs/common';
import { AuthUser } from '../../../../auth/auth-user';
import { IAppointmentRepository } from '../../../domain/appointment.repository';
import {
  findScopedAppointment,
  requireAppointmentAccess,
  toAppointment,
} from '../shared/appointment-rules';

export type CancelAppointmentInput = { user: AuthUser; id: string };

export class CancelAppointmentUseCase {
  constructor(private readonly repository: IAppointmentRepository) {}

  async execute({ user, id }: CancelAppointmentInput) {
    const appointment = await findScopedAppointment(this.repository, user, id);
    requireAppointmentAccess(user, appointment);
    if (!['PENDING', 'CONFIRMED'].includes(appointment.status)) {
      throw new BadRequestException(
        'Only pending or confirmed appointments can be cancelled',
      );
    }
    return toAppointment(
      await this.repository.updateAppointment(id, { status: 'CANCELLED' }),
    );
  }
}
