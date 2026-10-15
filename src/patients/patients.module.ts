import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PatientsController } from './infra/http/controllers/patients.controller';
import { PATIENT_PROVIDERS } from './patients.providers';
import { PatientExamStorage } from './infra/storage/patient-exam-storage';
import { PatientPdfService } from './infra/pdf/patient-pdf.service';

@Module({
  imports: [AuthModule],
  controllers: [PatientsController],
  providers: [
    PatientExamStorage,
    PatientPdfService,
    ...Object.values(PATIENT_PROVIDERS.REPOSITORIES),
    ...Object.values(PATIENT_PROVIDERS.USE_CASES),
  ],
  exports: [PatientExamStorage],
})
export class PatientsModule {}
