import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TreatmentPlansController } from './infra/http/controllers/treatment-plans.controller';
import { TREATMENT_PLAN_PROVIDERS } from './treatment-plans.providers';

@Module({
  imports: [AuthModule],
  controllers: [TreatmentPlansController],
  providers: [
    ...Object.values(TREATMENT_PLAN_PROVIDERS.REPOSITORIES),
    ...Object.values(TREATMENT_PLAN_PROVIDERS.USE_CASES),
  ],
})
export class TreatmentPlansModule {}
