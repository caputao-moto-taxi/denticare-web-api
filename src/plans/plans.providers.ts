import { PrismaService } from '../shared/infra/db/prisma/prisma.service';
import {
  AddPlanBenefitUseCase,
  CreatePlanUseCase,
  DeletePlanUseCase,
  GetPlanUseCase,
  ListPlanCurrenciesUseCase,
  ListPlansUseCase,
  UpdatePlanUseCase,
  UpdatePlanPromotionUseCase,
} from './application/useCases';
import { IPlanRepository } from './domain';
import { PlanPrismaRepository } from './infra/db/prisma/plan-prisma.repository';

export const REPOSITORIES = {
  PLAN_REPOSITORY: {
    provide: 'PlanRepository',
    useExisting: PlanPrismaRepository,
  },
  PLAN_PRISMA_REPOSITORY: {
    provide: PlanPrismaRepository,
    useFactory: (prismaService: PrismaService) => {
      return new PlanPrismaRepository(prismaService);
    },
    inject: [PrismaService],
  },
};

export const USE_CASES = {
  CREATE_PLAN_USE_CASE: {
    provide: CreatePlanUseCase,
    useFactory: (planRepository: IPlanRepository) => {
      return new CreatePlanUseCase(planRepository);
    },
    inject: [REPOSITORIES.PLAN_REPOSITORY.provide],
  },
  GET_PLAN_USE_CASE: {
    provide: GetPlanUseCase,
    useFactory: (planRepository: IPlanRepository) => {
      return new GetPlanUseCase(planRepository);
    },
    inject: [REPOSITORIES.PLAN_REPOSITORY.provide],
  },
  LIST_PLAN_USE_CASE: {
    provide: ListPlansUseCase,
    useFactory: (planRepository: IPlanRepository) => {
      return new ListPlansUseCase(planRepository);
    },
    inject: [REPOSITORIES.PLAN_REPOSITORY.provide],
  },
  LIST_PLAN_CURRENCIES_USE_CASE: {
    provide: ListPlanCurrenciesUseCase,
    useFactory: (planRepository: IPlanRepository) =>
      new ListPlanCurrenciesUseCase(planRepository),
    inject: [REPOSITORIES.PLAN_REPOSITORY.provide],
  },
  DELETE_PLAN_USE_CASE: {
    provide: DeletePlanUseCase,
    useFactory: (planRepository: IPlanRepository) =>
      new DeletePlanUseCase(planRepository),
    inject: [REPOSITORIES.PLAN_REPOSITORY.provide],
  },
  UPDATE_PLAN_PROMOTION_USE_CASE: {
    provide: UpdatePlanPromotionUseCase,
    useFactory: (planRepository: IPlanRepository) =>
      new UpdatePlanPromotionUseCase(planRepository),
    inject: [REPOSITORIES.PLAN_REPOSITORY.provide],
  },
  UPDATE_PLAN_USE_CASE: {
    provide: UpdatePlanUseCase,
    useFactory: (planRepository: IPlanRepository) =>
      new UpdatePlanUseCase(planRepository),
    inject: [REPOSITORIES.PLAN_REPOSITORY.provide],
  },
  ADD_PLAN_BENEFIT_USE_CASE: {
    provide: AddPlanBenefitUseCase,
    useFactory: (planRepository: IPlanRepository) =>
      new AddPlanBenefitUseCase(planRepository),
    inject: [REPOSITORIES.PLAN_REPOSITORY.provide],
  },
};

export const PLAN_PROVIDERS = {
  REPOSITORIES,
  USE_CASES,
};
