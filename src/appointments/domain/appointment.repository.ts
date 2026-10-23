import { ListQuery, PaginatedResult } from '../../shared/domain/list-query';
import {
  Appointment,
  AppointmentId,
  AppointmentStatus,
} from './appointment.aggregate';
import { AppointmentScope } from './appointment-access.policy';

export type BookedSlot = { doctorId: string; time: Date };

export type FindBookedSlotsQuery = {
  doctorIds: string[];
  date: Date;
  excludedAppointmentId?: string;
};

// Read model with everything needed to present an appointment.
export type AppointmentView = {
  id: string;
  date: Date;
  time: Date;
  reason: string;
  description: string | null;
  status: AppointmentStatus;
  patient: { id: string; firstName: string; lastName: string };
  doctor: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    specialty?: string;
  };
};

export type AppointmentListCriteria = Pick<
  ListQuery,
  'page' | 'pageSize' | 'search' | 'dateFrom' | 'dateTo'
> & {
  branchId: string;
  status?: AppointmentStatus;
  doctorId?: string;
  patientId?: string;
  restrictToPatientId?: string;
  restrictToDoctorId?: string;
};

export interface IAppointmentRepository {
  insert(appointment: Appointment): Promise<void>;
  update(appointment: Appointment): Promise<void>;
  findById(
    id: AppointmentId,
    scope: AppointmentScope,
  ): Promise<Appointment | null>;
  findViewById(
    id: AppointmentId,
    scope: AppointmentScope,
  ): Promise<AppointmentView | null>;
  listPaginated(
    criteria: AppointmentListCriteria,
  ): Promise<PaginatedResult<AppointmentView>>;
  findBookedSlots(query: FindBookedSlotsQuery): Promise<BookedSlot[]>;
  // Serializes concurrent bookings of the same doctor; `action` receives a
  // repository bound to the lock's transaction.
  runWithDoctorLock<T>(
    doctorId: string,
    action: (repository: IAppointmentRepository) => Promise<T>,
  ): Promise<T>;
}
