import { PrismaService } from '../shared/infra/db/prisma/prisma.service';
import { IPatientPdfGenerator } from './application/interfaces/patient-pdf-generator.interface';
import {
  AddPatientDiagnosisAttachmentsUseCase,
  AddPatientDiagnosisUseCase,
  AddPatientExamUseCase,
  AddPatientFinancialEntryUseCase,
  AddPatientPrescriptionUseCase,
  CreatePatientUseCase,
  DeletePatientUseCase,
  GetPatientChartPdfUseCase,
  GetPatientDetailsUseCase,
  GetPatientDiagnosisAttachmentUseCase,
  GetPatientExamFileUseCase,
  GetPatientFinancialPdfUseCase,
  GetPatientPrescriptionPdfUseCase,
  GetPatientUseCase,
  ListPatientsUseCase,
  ManagePatientAvatarUseCase,
  SetPatientStatusUseCase,
  UpdatePatientDiagnosisUseCase,
  UpdatePatientToothUseCase,
  UpdatePatientUseCase,
} from './application/useCases';
import { IPatientRepository } from './domain/patient.repository';
import { PatientsPrismaRepository } from './infra/db/prisma/patients-prisma.repository';
import { PatientPdfService } from './infra/pdf/patient-pdf.service';
import { PatientExamStorage } from './infra/storage/patient-exam-storage';

const REPOSITORIES = {
  PATIENT_REPOSITORY: {
    provide: 'PatientRepository',
    useExisting: PatientsPrismaRepository,
  },
  PATIENT_PRISMA_REPOSITORY: {
    provide: PatientsPrismaRepository,
    useFactory: (prismaService: PrismaService) =>
      new PatientsPrismaRepository(prismaService),
    inject: [PrismaService],
  },
};

function repositoryUseCase<T>(
  provide: new (repository: IPatientRepository) => T,
) {
  return {
    provide,
    useFactory: (repository: IPatientRepository) => new provide(repository),
    inject: [REPOSITORIES.PATIENT_REPOSITORY.provide],
  };
}

function pdfUseCase<T>(
  provide: new (
    repository: IPatientRepository,
    pdfGenerator: IPatientPdfGenerator,
  ) => T,
) {
  return {
    provide,
    useFactory: (
      repository: IPatientRepository,
      pdfGenerator: IPatientPdfGenerator,
    ) => new provide(repository, pdfGenerator),
    inject: [REPOSITORIES.PATIENT_REPOSITORY.provide, PatientPdfService],
  };
}

const USE_CASES = {
  MANAGE_PATIENT_AVATAR_USE_CASE: {
    provide: ManagePatientAvatarUseCase,
    useFactory: (repository: IPatientRepository, storage: PatientExamStorage) =>
      new ManagePatientAvatarUseCase(repository, storage),
    inject: [REPOSITORIES.PATIENT_REPOSITORY.provide, PatientExamStorage],
  },
  LIST_PATIENTS_USE_CASE: repositoryUseCase(ListPatientsUseCase),
  GET_PATIENT_USE_CASE: repositoryUseCase(GetPatientUseCase),
  GET_PATIENT_DETAILS_USE_CASE: repositoryUseCase(GetPatientDetailsUseCase),
  GET_PATIENT_CHART_PDF_USE_CASE: pdfUseCase(GetPatientChartPdfUseCase),
  GET_PATIENT_PRESCRIPTION_PDF_USE_CASE: pdfUseCase(
    GetPatientPrescriptionPdfUseCase,
  ),
  GET_PATIENT_FINANCIAL_PDF_USE_CASE: pdfUseCase(GetPatientFinancialPdfUseCase),
  UPDATE_PATIENT_TOOTH_USE_CASE: repositoryUseCase(UpdatePatientToothUseCase),
  ADD_PATIENT_DIAGNOSIS_USE_CASE: repositoryUseCase(AddPatientDiagnosisUseCase),
  UPDATE_PATIENT_DIAGNOSIS_USE_CASE: repositoryUseCase(
    UpdatePatientDiagnosisUseCase,
  ),
  ADD_PATIENT_DIAGNOSIS_ATTACHMENTS_USE_CASE: {
    provide: AddPatientDiagnosisAttachmentsUseCase,
    useFactory: (
      repository: IPatientRepository,
      storage: PatientExamStorage,
    ) => new AddPatientDiagnosisAttachmentsUseCase(repository, storage),
    inject: [REPOSITORIES.PATIENT_REPOSITORY.provide, PatientExamStorage],
  },
  GET_PATIENT_DIAGNOSIS_ATTACHMENT_USE_CASE: {
    provide: GetPatientDiagnosisAttachmentUseCase,
    useFactory: (
      repository: IPatientRepository,
      storage: PatientExamStorage,
    ) => new GetPatientDiagnosisAttachmentUseCase(repository, storage),
    inject: [REPOSITORIES.PATIENT_REPOSITORY.provide, PatientExamStorage],
  },
  ADD_PATIENT_PRESCRIPTION_USE_CASE: repositoryUseCase(
    AddPatientPrescriptionUseCase,
  ),
  ADD_PATIENT_FINANCIAL_ENTRY_USE_CASE: repositoryUseCase(
    AddPatientFinancialEntryUseCase,
  ),
  ADD_PATIENT_EXAM_USE_CASE: {
    provide: AddPatientExamUseCase,
    useFactory: (
      repository: IPatientRepository,
      storage: PatientExamStorage,
    ) => new AddPatientExamUseCase(repository, storage),
    inject: [REPOSITORIES.PATIENT_REPOSITORY.provide, PatientExamStorage],
  },
  GET_PATIENT_EXAM_FILE_USE_CASE: {
    provide: GetPatientExamFileUseCase,
    useFactory: (
      repository: IPatientRepository,
      storage: PatientExamStorage,
    ) => new GetPatientExamFileUseCase(repository, storage),
    inject: [REPOSITORIES.PATIENT_REPOSITORY.provide, PatientExamStorage],
  },
  CREATE_PATIENT_USE_CASE: repositoryUseCase(CreatePatientUseCase),
  UPDATE_PATIENT_USE_CASE: repositoryUseCase(UpdatePatientUseCase),
  SET_PATIENT_STATUS_USE_CASE: repositoryUseCase(SetPatientStatusUseCase),
  DELETE_PATIENT_USE_CASE: repositoryUseCase(DeletePatientUseCase),
};

export const PATIENT_PROVIDERS = { REPOSITORIES, USE_CASES };
