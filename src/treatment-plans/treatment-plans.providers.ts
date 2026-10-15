import { PrismaService } from '../shared/infra/db/prisma/prisma.service';
import { TreatmentPlansUseCases } from './application/useCases/treatment-plans.use-cases';
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
  TREATMENT_PLANS_USE_CASES: {
    provide: TreatmentPlansUseCases,
    useFactory: (repository: ITreatmentPlanRepository) =>
      new TreatmentPlansUseCases(repository),
    inject: [REPOSITORIES.TREATMENT_PLAN_REPOSITORY.provide],
  },
};

export const TREATMENT_PLAN_PROVIDERS = { REPOSITORIES, USE_CASES };
