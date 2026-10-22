import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PatientsModule } from '../patients/patients.module';
import { HashModule } from '../shared/application/hash.module';
import { DoctorsController } from './infra/http/controllers/doctors.controller';
import { DOCTOR_PROVIDERS } from './doctors.providers';

@Module({
  imports: [AuthModule, HashModule, PatientsModule],
  controllers: [DoctorsController],
  providers: [
    ...Object.values(DOCTOR_PROVIDERS.REPOSITORIES),
    ...Object.values(DOCTOR_PROVIDERS.USE_CASES),
  ],
})
export class DoctorsModule {}
