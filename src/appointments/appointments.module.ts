import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AppointmentsController } from './infra/http/controllers/appointments.controller';
import { APPOINTMENT_PROVIDERS } from './appointments.providers';

@Module({
  imports: [AuthModule],
  controllers: [AppointmentsController],
  providers: [
    ...Object.values(APPOINTMENT_PROVIDERS.REPOSITORIES),
    ...Object.values(APPOINTMENT_PROVIDERS.USE_CASES),
  ],
})
export class AppointmentsModule {}
