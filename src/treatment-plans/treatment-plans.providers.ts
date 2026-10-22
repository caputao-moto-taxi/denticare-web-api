import { PrismaService } from '../shared/infra/db/prisma/prisma.service';
import { CreateTreatmentPlanUseCase } from './application/useCases/create-treatment-plan/create-treatment-plan-use-case';
import { DeleteTreatmentPlanUseCase } from './application/useCases/delete-treatment-plan/delete-treatment-plan-use-case';
import { GetTreatmentPlanUseCase } from './application/useCases/get-treatment-plan/get-treatment-plan-use-case';
import { ListTreatmentPlansUseCase } from './application/useCases/list-treatment-plans/list-treatment-plans-use-case';
import { SetTreatmentPlanProgressUseCase } from './application/useCases/set-treatment-plan-progress/set-treatment-plan-progress-use-case';
import { UpdateTreatmentPlanUseCase } from './application/useCases/update-treatment-plan/update-treatment-plan-use-case';
import { ITreatmentPlanRepository } from './domain/treatment-plan.repository';
import { TreatmentPlansPrismaRepository } from './infra/db/prisma/treatment-plans-prisma.repository';

const REPOSITORIES = {
  TREATMENT_PLAN_REPOSITORY: {
    provide: 'TreatmentPlanRepository',
    useExisting: TreatmentPlansPrismaRepository,
  },
  TREATMENT_PLAN_PRISMA_REPOSITORY: {
    provide: TreatmentPlansPrismaRepository,
    useFactory: (prismaService: PrismaService) =>
      new TreatmentPlansPrismaRepository(prismaService),
    inject: [PrismaService],
  },
};

const USE_CASES = {
  LIST: {
    provide: ListTreatmentPlansUseCase,
    useFactory: (repository: ITreatmentPlanRepository) =>
      new ListTreatmentPlansUseCase(repository),
    inject: [REPOSITORIES.TREATMENT_PLAN_REPOSITORY.provide],
  },
  GET: {
    provide: GetTreatmentPlanUseCase,
    useFactory: (repository: ITreatmentPlanRepository) =>
      new GetTreatmentPlanUseCase(repository),
    inject: [REPOSITORIES.TREATMENT_PLAN_REPOSITORY.provide],
  },
  CREATE: {
    provide: CreateTreatmentPlanUseCase,
    useFactory: (repository: ITreatmentPlanRepository) =>
      new CreateTreatmentPlanUseCase(repository),
    inject: [REPOSITORIES.TREATMENT_PLAN_REPOSITORY.provide],
  },
  UPDATE: {
    provide: UpdateTreatmentPlanUseCase,
    useFactory: (repository: ITreatmentPlanRepository) =>
      new UpdateTreatmentPlanUseCase(repository),
    inject: [REPOSITORIES.TREATMENT_PLAN_REPOSITORY.provide],
  },
  SET_PROGRESS: {
    provide: SetTreatmentPlanProgressUseCase,
    useFactory: (repository: ITreatmentPlanRepository) =>
      new SetTreatmentPlanProgressUseCase(repository),
    inject: [REPOSITORIES.TREATMENT_PLAN_REPOSITORY.provide],
  },
  DELETE: {
    provide: DeleteTreatmentPlanUseCase,
    useFactory: (repository: ITreatmentPlanRepository) =>
      new DeleteTreatmentPlanUseCase(repository),
    inject: [REPOSITORIES.TREATMENT_PLAN_REPOSITORY.provide],
  },
};

export const TREATMENT_PLAN_PROVIDERS = { REPOSITORIES, USE_CASES };
