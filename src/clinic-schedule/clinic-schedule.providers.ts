import { PrismaService } from '../shared/infra/db/prisma/prisma.service';
import {
  GetClinicScheduleUseCase,
  UpdateClinicScheduleUseCase,
} from './application/useCases';
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
  GET_CLINIC_SCHEDULE_USE_CASE: {
    provide: GetClinicScheduleUseCase,
    useFactory: (repository: IClinicScheduleRepository) =>
      new GetClinicScheduleUseCase(repository),
    inject: [REPOSITORIES.CLINIC_SCHEDULE_REPOSITORY.provide],
  },
  UPDATE_CLINIC_SCHEDULE_USE_CASE: {
    provide: UpdateClinicScheduleUseCase,
    useFactory: (repository: IClinicScheduleRepository) =>
      new UpdateClinicScheduleUseCase(repository),
    inject: [REPOSITORIES.CLINIC_SCHEDULE_REPOSITORY.provide],
  },
};

export const CLINIC_SCHEDULE_PROVIDERS = { REPOSITORIES, USE_CASES };
