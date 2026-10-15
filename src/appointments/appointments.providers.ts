import { PrismaService } from '../shared/infra/db/prisma/prisma.service';
import { AppointmentsUseCases } from './application/useCases/appointments.use-cases';
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
  APPOINTMENTS_USE_CASES: {
    provide: AppointmentsUseCases,
    useFactory: (appointmentRepository: IAppointmentRepository) =>
      new AppointmentsUseCases(appointmentRepository),
    inject: [REPOSITORIES.APPOINTMENT_REPOSITORY.provide],
  },
};

export const APPOINTMENT_PROVIDERS = { REPOSITORIES, USE_CASES };
