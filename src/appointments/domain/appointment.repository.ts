export type CreateAppointmentCommand = {
  patientId: string;
  doctorId?: string;
  date: string;
  time: string;
  reason: string;
  description?: string;
};

export type RescheduleAppointmentCommand = { date: string; time: string };
export type UpdateAppointmentCommand = Omit<
  CreateAppointmentCommand,
  'doctorId'
> & { doctorId: string };
export type AppointmentAvailabilityQuery = {
  doctorId?: string;
  date: string;
  excludeAppointmentId?: string;
};

export type AppointmentStatusCode =
  | 'PENDING'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'COMPLETED'
  | 'RESCHEDULED'
  | 'NO_SHOW';

export type AppointmentPersonRecord = {
  id: string;
  userId: string | null;
  branchId: string;
  deletedAt: Date | null;
  firstName: string;
  lastName: string;
  Role: { slug: string } | null;
};

export type AppointmentDoctorRecord = {
  id: string;
  email: string;
  branchId: string | null;
  deletedAt: Date | null;
  isActive: boolean;
  createdAt: Date;
  Role: { slug: string } | null;
  Person: Array<{ firstName: string; lastName: string }>;
  doctorProfile: {
    specialties: string[];
    workingDays: string[];
    workingHours: unknown;
  } | null;
};

export type AppointmentRecord = {
  id: string;
  date: Date;
  time: Date;
  reason: string;
  description: string | null;
  status: AppointmentStatusCode;
  patientId: string;
  doctorId: string;
  userId: string | null;
  deletedAt: Date | null;
  patient: AppointmentPersonRecord;
  doctor: AppointmentDoctorRecord;
};

export type AppointmentClinicRecord = {
  deletedAt: Date | null;
  workingDays: string[];
  workingHours: unknown;
  timezone: string;
};

export type AppointmentSlotRecord = {
  id?: string;
  doctorId: string;
  time: Date;
  status: AppointmentStatusCode;
  deletedAt: Date | null;
};

export type AppointmentListCriteria = {
  branchId: string;
  doctorScopeId?: string;
  patientScopeId?: string;
  doctorId?: string;
  patientId?: string;
  status?: AppointmentStatusCode;
  dateFrom?: Date;
  dateToExclusive?: Date;
  search?: string;
  skip: number;
  take: number;
};

export type CreateAppointmentData = {
  date: Date;
  time: Date;
  reason: string;
  description?: string;
  status: 'CONFIRMED';
  patientId: string;
  doctorId: string;
  userId: string;
};

export type UpdateAppointmentData = {
  date?: Date;
  time?: Date;
  reason?: string;
  description?: string | null;
  status?: AppointmentStatusCode;
  patientId?: string;
  doctorId?: string;
};

export class AppointmentSlotConflictError extends Error {
  constructor() {
    super('Doctor is already booked for this time slot');
    this.name = AppointmentSlotConflictError.name;
  }
}

export abstract class IAppointmentRepository {
  abstract transaction<T>(
    operation: (repository: IAppointmentRepository) => Promise<T>,
  ): Promise<T>;

  abstract findBranchSchedule(
    branchId: string,
  ): Promise<AppointmentClinicRecord | null>;
  abstract findPatientById(id: string): Promise<AppointmentPersonRecord | null>;
  abstract findPatientByUserId(
    userId: string,
    branchId: string,
  ): Promise<AppointmentPersonRecord | null>;
  abstract findDoctorById(id: string): Promise<AppointmentDoctorRecord | null>;
  abstract findDoctorsByBranch(
    branchId: string,
  ): Promise<AppointmentDoctorRecord[]>;
  abstract findAppointmentById(id: string): Promise<AppointmentRecord | null>;
  abstract findAppointments(
    criteria: AppointmentListCriteria,
  ): Promise<{ appointments: AppointmentRecord[]; total: number }>;
  abstract findAppointmentsForDoctorsOnDate(
    doctorIds: string[],
    date: Date,
  ): Promise<AppointmentSlotRecord[]>;
  abstract findAppointmentsForDoctorOnDate(
    doctorId: string,
    date: Date,
  ): Promise<AppointmentSlotRecord[]>;
  abstract lockDoctorForAppointment(doctorId: string): Promise<void>;
  abstract createAppointment(
    data: CreateAppointmentData,
  ): Promise<AppointmentRecord>;
  abstract updateAppointment(
    id: string,
    data: UpdateAppointmentData,
  ): Promise<AppointmentRecord>;
}
