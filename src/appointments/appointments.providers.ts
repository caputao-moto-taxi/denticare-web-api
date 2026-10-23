import { PrismaService } from '../shared/infra/db/prisma/prisma.service';
import { AppointmentSchedulingService } from './application/common/appointment-scheduling.service';
import {
  CancelAppointmentUseCase,
  CompleteAppointmentUseCase,
  CreateAppointmentUseCase,
  GetAppointmentAvailabilityUseCase,
  GetAppointmentUseCase,
  ListAppointmentsUseCase,
  RescheduleAppointmentUseCase,
  UpdateAppointmentUseCase,
} from './application/useCases';
import {
  IAppointmentClinicRepository,
  IAppointmentDoctorRepository,
  IAppointmentPatientRepository,
  IAppointmentRepository,
} from './domain';
import { AppointmentClinicPrismaRepository } from './infra/db/prisma/appointment-clinic-prisma.repository';
import { AppointmentDoctorPrismaRepository } from './infra/db/prisma/appointment-doctor-prisma.repository';
import { AppointmentPatientPrismaRepository } from './infra/db/prisma/appointment-patient-prisma.repository';
import { AppointmentsPrismaRepository } from './infra/db/prisma/appointments-prisma.repository';

export const REPOSITORIES = {
  APPOINTMENT_REPOSITORY: {
    provide: 'AppointmentRepository',
    useExisting: AppointmentsPrismaRepository,
  },
  APPOINTMENT_PRISMA_REPOSITORY: {
    provide: AppointmentsPrismaRepository,
    useFactory: (prismaService: PrismaService) =>
      new AppointmentsPrismaRepository(prismaService),
    inject: [PrismaService],
  },
  APPOINTMENT_CLINIC_REPOSITORY: {
    provide: 'AppointmentClinicRepository',
    useExisting: AppointmentClinicPrismaRepository,
  },
  APPOINTMENT_CLINIC_PRISMA_REPOSITORY: {
    provide: AppointmentClinicPrismaRepository,
    useFactory: (prismaService: PrismaService) =>
      new AppointmentClinicPrismaRepository(prismaService),
    inject: [PrismaService],
  },
  APPOINTMENT_PATIENT_REPOSITORY: {
    provide: 'AppointmentPatientRepository',
    useExisting: AppointmentPatientPrismaRepository,
  },
  APPOINTMENT_PATIENT_PRISMA_REPOSITORY: {
    provide: AppointmentPatientPrismaRepository,
    useFactory: (prismaService: PrismaService) =>
      new AppointmentPatientPrismaRepository(prismaService),
    inject: [PrismaService],
  },
  APPOINTMENT_DOCTOR_REPOSITORY: {
    provide: 'AppointmentDoctorRepository',
    useExisting: AppointmentDoctorPrismaRepository,
  },
  APPOINTMENT_DOCTOR_PRISMA_REPOSITORY: {
    provide: AppointmentDoctorPrismaRepository,
    useFactory: (prismaService: PrismaService) =>
      new AppointmentDoctorPrismaRepository(prismaService),
    inject: [PrismaService],
  },
};

export const SERVICES = {
  APPOINTMENT_SCHEDULING_SERVICE: {
    provide: AppointmentSchedulingService,
    useFactory: (
      clinicRepository: IAppointmentClinicRepository,
      appointmentRepository: IAppointmentRepository,
    ) =>
      new AppointmentSchedulingService(clinicRepository, appointmentRepository),
    inject: [
      REPOSITORIES.APPOINTMENT_CLINIC_REPOSITORY.provide,
      REPOSITORIES.APPOINTMENT_REPOSITORY.provide,
    ],
  },
};

export const USE_CASES = {
  LIST_APPOINTMENTS_USE_CASE: {
    provide: ListAppointmentsUseCase,
    useFactory: (
      appointmentRepository: IAppointmentRepository,
      patientRepository: IAppointmentPatientRepository,
    ) => new ListAppointmentsUseCase(appointmentRepository, patientRepository),
    inject: [
      REPOSITORIES.APPOINTMENT_REPOSITORY.provide,
      REPOSITORIES.APPOINTMENT_PATIENT_REPOSITORY.provide,
    ],
  },
  GET_APPOINTMENT_USE_CASE: {
    provide: GetAppointmentUseCase,
    useFactory: (appointmentRepository: IAppointmentRepository) =>
      new GetAppointmentUseCase(appointmentRepository),
    inject: [REPOSITORIES.APPOINTMENT_REPOSITORY.provide],
  },
  CREATE_APPOINTMENT_USE_CASE: {
    provide: CreateAppointmentUseCase,
    useFactory: (
      appointmentRepository: IAppointmentRepository,
      patientRepository: IAppointmentPatientRepository,
      doctorRepository: IAppointmentDoctorRepository,
      scheduling: AppointmentSchedulingService,
    ) =>
      new CreateAppointmentUseCase(
        appointmentRepository,
        patientRepository,
        doctorRepository,
        scheduling,
      ),
    inject: [
      REPOSITORIES.APPOINTMENT_REPOSITORY.provide,
      REPOSITORIES.APPOINTMENT_PATIENT_REPOSITORY.provide,
      REPOSITORIES.APPOINTMENT_DOCTOR_REPOSITORY.provide,
      SERVICES.APPOINTMENT_SCHEDULING_SERVICE.provide,
    ],
  },
  CANCEL_APPOINTMENT_USE_CASE: {
    provide: CancelAppointmentUseCase,
    useFactory: (appointmentRepository: IAppointmentRepository) =>
      new CancelAppointmentUseCase(appointmentRepository),
    inject: [REPOSITORIES.APPOINTMENT_REPOSITORY.provide],
  },
  COMPLETE_APPOINTMENT_USE_CASE: {
    provide: CompleteAppointmentUseCase,
    useFactory: (appointmentRepository: IAppointmentRepository) =>
      new CompleteAppointmentUseCase(appointmentRepository),
    inject: [REPOSITORIES.APPOINTMENT_REPOSITORY.provide],
  },
  RESCHEDULE_APPOINTMENT_USE_CASE: {
    provide: RescheduleAppointmentUseCase,
    useFactory: (
      appointmentRepository: IAppointmentRepository,
      doctorRepository: IAppointmentDoctorRepository,
      scheduling: AppointmentSchedulingService,
    ) =>
      new RescheduleAppointmentUseCase(
        appointmentRepository,
        doctorRepository,
        scheduling,
      ),
    inject: [
      REPOSITORIES.APPOINTMENT_REPOSITORY.provide,
      REPOSITORIES.APPOINTMENT_DOCTOR_REPOSITORY.provide,
      SERVICES.APPOINTMENT_SCHEDULING_SERVICE.provide,
    ],
  },
  UPDATE_APPOINTMENT_USE_CASE: {
    provide: UpdateAppointmentUseCase,
    useFactory: (
      appointmentRepository: IAppointmentRepository,
      patientRepository: IAppointmentPatientRepository,
      doctorRepository: IAppointmentDoctorRepository,
      scheduling: AppointmentSchedulingService,
    ) =>
      new UpdateAppointmentUseCase(
        appointmentRepository,
        patientRepository,
        doctorRepository,
        scheduling,
      ),
    inject: [
      REPOSITORIES.APPOINTMENT_REPOSITORY.provide,
      REPOSITORIES.APPOINTMENT_PATIENT_REPOSITORY.provide,
      REPOSITORIES.APPOINTMENT_DOCTOR_REPOSITORY.provide,
      SERVICES.APPOINTMENT_SCHEDULING_SERVICE.provide,
    ],
  },
  GET_APPOINTMENT_AVAILABILITY_USE_CASE: {
    provide: GetAppointmentAvailabilityUseCase,
    useFactory: (
      appointmentRepository: IAppointmentRepository,
      doctorRepository: IAppointmentDoctorRepository,
      scheduling: AppointmentSchedulingService,
    ) =>
      new GetAppointmentAvailabilityUseCase(
        appointmentRepository,
        doctorRepository,
        scheduling,
      ),
    inject: [
      REPOSITORIES.APPOINTMENT_REPOSITORY.provide,
      REPOSITORIES.APPOINTMENT_DOCTOR_REPOSITORY.provide,
      SERVICES.APPOINTMENT_SCHEDULING_SERVICE.provide,
    ],
  },
};

export const APPOINTMENT_PROVIDERS = {
  REPOSITORIES,
  SERVICES,
  USE_CASES,
};
