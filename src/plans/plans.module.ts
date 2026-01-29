import { Module } from '@nestjs/common';
import { PLAN_PROVIDERS } from './plans.providers';
import { PlansController } from './infra/http/controllers/plans.controller';

@Module({
  controllers: [PlansController],
  providers: [
    ...Object.values(PLAN_PROVIDERS.REPOSITORIES),
    ...Object.values(PLAN_PROVIDERS.USE_CASES),
  ],
  exports: [PLAN_PROVIDERS.REPOSITORIES.PLAN_REPOSITORY.provide],
})
export class PlanModule {}
