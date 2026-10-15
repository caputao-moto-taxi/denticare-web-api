import { PrismaService } from '../shared/infra/db/prisma/prisma.service';
import { PatientsUseCases } from './application/useCases/patients.use-cases';
import { IPatientRepository } from './domain/patient.repository';
import { PatientsPrismaRepository } from './infra/db/prisma/patients-prisma.repository';
import { PatientExamStorage } from './infra/storage/patient-exam-storage';

const REPOSITORIES = {
  PATIENT_REPOSITORY: {
    provide: 'PatientRepository',
    useExisting: PatientsPrismaRepository,
  },
  PATIENT_PRISMA_REPOSITORY: {
    provide: PatientsPrismaRepository,
    useFactory: (
      prismaService: PrismaService,
      examStorage: PatientExamStorage,
    ) => new PatientsPrismaRepository(prismaService, examStorage),
    inject: [PrismaService, PatientExamStorage],
  },
};

const USE_CASES = {
  PATIENTS_USE_CASES: {
    provide: PatientsUseCases,
    useFactory: (patientRepository: IPatientRepository) =>
      new PatientsUseCases(patientRepository),
    inject: [REPOSITORIES.PATIENT_REPOSITORY.provide],
  },
};

export const PATIENT_PROVIDERS = { REPOSITORIES, USE_CASES };
