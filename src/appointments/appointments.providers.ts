import { PrismaService } from '../shared/infra/db/prisma/prisma.service';
import { CancelAppointmentUseCase } from './application/useCases/cancel-appointment/cancel-appointment-use-case';
import { CompleteAppointmentUseCase } from './application/useCases/complete-appointment/complete-appointment-use-case';
import { CreateAppointmentUseCase } from './application/useCases/create-appointment/create-appointment-use-case';
import { GetAppointmentAvailabilityUseCase } from './application/useCases/get-appointment-availability/get-appointment-availability-use-case';
import { GetAppointmentUseCase } from './application/useCases/get-appointment/get-appointment-use-case';
import { ListAppointmentsUseCase } from './application/useCases/list-appointments/list-appointments-use-case';
import { RescheduleAppointmentUseCase } from './application/useCases/reschedule-appointment/reschedule-appointment-use-case';
import { UpdateAppointmentUseCase } from './application/useCases/update-appointment/update-appointment-use-case';
import { IAppointmentRepository } from './domain/appointment.repository';
import { AppointmentsPrismaRepository } from './infra/db/prisma/appointments-prisma.repository';

const REPOSITORIES = {
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
};

const USE_CASES = {
  LIST: {
    provide: ListAppointmentsUseCase,
    useFactory: (repository: IAppointmentRepository) =>
      new ListAppointmentsUseCase(repository),
    inject: [REPOSITORIES.APPOINTMENT_REPOSITORY.provide],
  },
  GET: {
    provide: GetAppointmentUseCase,
    useFactory: (repository: IAppointmentRepository) =>
      new GetAppointmentUseCase(repository),
    inject: [REPOSITORIES.APPOINTMENT_REPOSITORY.provide],
  },
  CREATE: {
    provide: CreateAppointmentUseCase,
    useFactory: (repository: IAppointmentRepository) =>
      new CreateAppointmentUseCase(repository),
    inject: [REPOSITORIES.APPOINTMENT_REPOSITORY.provide],
  },
  CANCEL: {
    provide: CancelAppointmentUseCase,
    useFactory: (repository: IAppointmentRepository) =>
      new CancelAppointmentUseCase(repository),
    inject: [REPOSITORIES.APPOINTMENT_REPOSITORY.provide],
  },
  COMPLETE: {
    provide: CompleteAppointmentUseCase,
    useFactory: (repository: IAppointmentRepository) =>
      new CompleteAppointmentUseCase(repository),
    inject: [REPOSITORIES.APPOINTMENT_REPOSITORY.provide],
  },
  RESCHEDULE: {
    provide: RescheduleAppointmentUseCase,
    useFactory: (repository: IAppointmentRepository) =>
      new RescheduleAppointmentUseCase(repository),
    inject: [REPOSITORIES.APPOINTMENT_REPOSITORY.provide],
  },
  UPDATE: {
    provide: UpdateAppointmentUseCase,
    useFactory: (repository: IAppointmentRepository) =>
      new UpdateAppointmentUseCase(repository),
    inject: [REPOSITORIES.APPOINTMENT_REPOSITORY.provide],
  },
  AVAILABILITY: {
    provide: GetAppointmentAvailabilityUseCase,
    useFactory: (repository: IAppointmentRepository) =>
      new GetAppointmentAvailabilityUseCase(repository),
    inject: [REPOSITORIES.APPOINTMENT_REPOSITORY.provide],
  },
};

export const APPOINTMENT_PROVIDERS = { REPOSITORIES, USE_CASES };
