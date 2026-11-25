import { ForbiddenException } from '@nestjs/common';
import { AuthUser } from '../../../../auth/auth-user';
import { hasPermission } from '../../../../auth/permissions';
import {
  ListQuery,
  pageWindow,
  paginated,
} from '../../../../shared/domain/list-query';
import {
  dateRange,
  validateListFilters,
} from '../../../../shared/helpers/list-filters';
import {
  AppointmentStatusCode,
  IAppointmentRepository,
} from '../../../domain/appointment.repository';
import { toAppointment } from '../shared/appointment-rules';

export type ListAppointmentsInput = { user: AuthUser; query?: ListQuery };

const STATUSES: Record<string, AppointmentStatusCode> = {
  pending: 'PENDING',
  confirmed: 'CONFIRMED',
  cancelled: 'CANCELLED',
  completed: 'COMPLETED',
};

export class ListAppointmentsUseCase {
  constructor(private readonly repository: IAppointmentRepository) {}

  async execute({ user, query = {} }: ListAppointmentsInput) {
    validateListFilters(query, {
      status: Object.keys(STATUSES),
      doctorId: true,
      patientId: true,
    });

    const canReadAll =
      hasPermission(user, 'appointments.read.all') ||
      hasPermission(user, 'appointments.manage');
    const canReadAssigned = hasPermission(user, 'appointments.read.assigned');
    if (user.role !== 'patient' && !canReadAll && !canReadAssigned) {
      throw new ForbiddenException('Appointment read access is required');
    }

    const patient =
      user.role === 'patient'
        ? await this.repository.findPatientByUserId(user.id, user.branchId)
        : null;
    const range = dateRange(query);
    const { skip, take } = pageWindow(query);
    const { appointments, total } = await this.repository.findAppointments({
      branchId: user.branchId,
      doctorScopeId:
        user.role !== 'patient' && !canReadAll ? user.id : undefined,
      patientScopeId:
        user.role === 'patient'
          ? (patient?.id ?? '__no-patient-profile__')
          : undefined,
      doctorId: query.doctorId,
      patientId: query.patientId,
      status: query.status ? STATUSES[query.status] : undefined,
      dateFrom: range.gte,
      dateToExclusive: range.lt,
      search: query.search,
      skip,
      take,
    });

    return paginated(appointments.map(toAppointment), total, query);
  }
}
