import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PlatformOwnerGuard } from '../subscriptions/infra/http/platform-owner.guard';
import { PLAN_PROVIDERS } from './plans.providers';
import { PlansController } from './infra/http/controllers/plans.controller';

@Module({
  imports: [AuthModule],
  controllers: [PlansController],
  providers: [
    PlatformOwnerGuard,
    ...Object.values(PLAN_PROVIDERS.REPOSITORIES),
    ...Object.values(PLAN_PROVIDERS.USE_CASES),
  ],
  exports: [PLAN_PROVIDERS.REPOSITORIES.PLAN_REPOSITORY.provide],
})
export class PlanModule {}
