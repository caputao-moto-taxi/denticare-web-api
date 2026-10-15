import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CLINIC_SCHEDULE_PROVIDERS } from './clinic-schedule.providers';
import { ClinicScheduleController } from './infra/http/controllers/clinic-schedule.controller';

@Module({
  imports: [AuthModule],
  controllers: [ClinicScheduleController],
  providers: [
    ...Object.values(CLINIC_SCHEDULE_PROVIDERS.REPOSITORIES),
    ...Object.values(CLINIC_SCHEDULE_PROVIDERS.USE_CASES),
  ],
})
export class ClinicScheduleModule {}
