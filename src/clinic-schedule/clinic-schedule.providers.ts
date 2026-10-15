import { PrismaService } from '../shared/infra/db/prisma/prisma.service';
import { ClinicScheduleUseCases } from './application/useCases/clinic-schedule.use-cases';
import { IClinicScheduleRepository } from './domain/clinic-schedule.repository';
import { ClinicSchedulePrismaRepository } from './infra/db/prisma/clinic-schedule-prisma.repository';

const REPOSITORIES = {
  CLINIC_SCHEDULE_REPOSITORY: {
    provide: 'ClinicScheduleRepository',
    useExisting: ClinicSchedulePrismaRepository,
  },
  CLINIC_SCHEDULE_PRISMA_REPOSITORY: {
    provide: ClinicSchedulePrismaRepository,
    useFactory: (prismaService: PrismaService) =>
      new ClinicSchedulePrismaRepository(prismaService),
    inject: [PrismaService],
  },
};

const USE_CASES = {
  CLINIC_SCHEDULE_USE_CASES: {
    provide: ClinicScheduleUseCases,
    useFactory: (repository: IClinicScheduleRepository) =>
      new ClinicScheduleUseCases(repository),
    inject: [REPOSITORIES.CLINIC_SCHEDULE_REPOSITORY.provide],
  },
};

export const CLINIC_SCHEDULE_PROVIDERS = { REPOSITORIES, USE_CASES };
