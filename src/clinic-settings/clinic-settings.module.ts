import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PatientsModule } from '../patients/patients.module';
import { ClinicSettingsPrismaRepository } from './infra/db/prisma/clinic-settings-prisma.repository';
import {
  GetClinicSettingsUseCase,
  GetPublicClinicUseCase,
  ManageClinicLogoUseCase,
  ManageClinicServicesUseCase,
  UpdateClinicSettingsUseCase,
} from './application/useCases/clinic-settings.use-cases';
import { ClinicServicesController } from './infra/http/controllers/clinic-services.controller';
import { ClinicSettingsController } from './infra/http/controllers/clinic-settings.controller';
import { PublicClinicsController } from './infra/http/controllers/public-clinics.controller';
import { IClinicSettingsRepository } from './domain/clinic-settings.repository';
import { PatientExamStorage } from '../patients/infra/storage/patient-exam-storage';

@Module({
  imports: [AuthModule, PatientsModule],
  controllers: [
    ClinicSettingsController,
    ClinicServicesController,
    PublicClinicsController,
  ],
  providers: [
    ClinicSettingsPrismaRepository,
    {
      provide: IClinicSettingsRepository,
      useExisting: ClinicSettingsPrismaRepository,
    },
    {
      provide: GetClinicSettingsUseCase,
      useFactory: (repository: IClinicSettingsRepository) =>
        new GetClinicSettingsUseCase(repository),
      inject: [IClinicSettingsRepository],
    },
    {
      provide: UpdateClinicSettingsUseCase,
      useFactory: (repository: IClinicSettingsRepository) =>
        new UpdateClinicSettingsUseCase(repository),
      inject: [IClinicSettingsRepository],
    },
    {
      provide: ManageClinicServicesUseCase,
      useFactory: (repository: IClinicSettingsRepository) =>
        new ManageClinicServicesUseCase(repository),
      inject: [IClinicSettingsRepository],
    },
    {
      provide: GetPublicClinicUseCase,
      useFactory: (repository: IClinicSettingsRepository) =>
        new GetPublicClinicUseCase(repository),
      inject: [IClinicSettingsRepository],
    },
    {
      provide: ManageClinicLogoUseCase,
      useFactory: (
        repository: IClinicSettingsRepository,
        storage: PatientExamStorage,
      ) => new ManageClinicLogoUseCase(repository, storage),
      inject: [IClinicSettingsRepository, PatientExamStorage],
    },
  ],
})
export class ClinicSettingsModule {}
