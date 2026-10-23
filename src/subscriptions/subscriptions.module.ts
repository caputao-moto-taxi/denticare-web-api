import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PatientExamStorage } from '../patients/infra/storage/patient-exam-storage';
import { SubscriptionJobsService } from './application/subscription-jobs.service';
import { SubscriptionsService } from './application/subscriptions.service';
import { SubscriptionAdminController } from './infra/http/subscription-admin.controller';
import {
  ClinicAdminGuard,
  PlatformOwnerGuard,
} from './infra/http/platform-owner.guard';
import { SubscriptionsController } from './infra/http/subscriptions.controller';

@Module({
  imports: [AuthModule],
  controllers: [SubscriptionsController, SubscriptionAdminController],
  providers: [
    SubscriptionsService,
    SubscriptionJobsService,
    PlatformOwnerGuard,
    ClinicAdminGuard,
    PatientExamStorage,
  ],
  exports: [PlatformOwnerGuard],
})
export class SubscriptionsModule {}
