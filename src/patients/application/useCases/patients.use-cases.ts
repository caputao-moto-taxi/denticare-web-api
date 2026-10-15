import { AuthUser } from '../../../auth/auth-user';
import { ListQuery } from '../../../shared/domain/list-query';
import {
  IPatientRepository,
  PatientCreateCommand,
  PatientChartPdfData,
  PatientDiagnosisCommand,
  PatientDiagnosisAttachmentCommand,
  PatientExamCommand,
  PatientFinancialEntryCommand,
  PatientFinancialPdfData,
  PatientPrescriptionCommand,
  PatientPrescriptionPdfData,
  PatientStatusCommand,
  PatientToothCommand,
  PatientUpdateCommand,
} from '../../domain/patient.repository';

export class PatientsUseCases {
  constructor(private readonly patientRepository: IPatientRepository) {}

  list(user: AuthUser, query?: ListQuery) {
    return this.patientRepository.list(user, query);
  }

  findOne(user: AuthUser, id: string) {
    return this.patientRepository.findOne(user, id);
  }

  details(user: AuthUser, id: string) {
    return this.patientRepository.details(user, id);
  }

  getPatientChartPdfData(
    user: AuthUser,
    id: string,
  ): Promise<PatientChartPdfData> {
    return this.patientRepository.getPatientChartPdfData(user, id);
  }

  getPrescriptionPdfData(
    user: AuthUser,
    id: string,
    prescriptionId: string,
  ): Promise<PatientPrescriptionPdfData> {
    return this.patientRepository.getPrescriptionPdfData(
      user,
      id,
      prescriptionId,
    );
  }

  getFinancialPdfData(
    user: AuthUser,
    id: string,
    financialId: string,
  ): Promise<PatientFinancialPdfData> {
    return this.patientRepository.getFinancialPdfData(user, id, financialId);
  }

  updateTooth(user: AuthUser, id: string, input: PatientToothCommand) {
    return this.patientRepository.updateTooth(user, id, input);
  }

  addDiagnosis(user: AuthUser, id: string, input: PatientDiagnosisCommand) {
    return this.patientRepository.addDiagnosis(user, id, input);
  }

  updateDiagnosis(
    user: AuthUser,
    id: string,
    diagnosisId: string,
    input: PatientDiagnosisCommand,
  ) {
    return this.patientRepository.updateDiagnosis(user, id, diagnosisId, input);
  }

  addDiagnosisAttachments(
    user: AuthUser,
    id: string,
    diagnosisId: string,
    files: PatientDiagnosisAttachmentCommand[],
  ) {
    return this.patientRepository.addDiagnosisAttachments(
      user,
      id,
      diagnosisId,
      files,
    );
  }

  getDiagnosisAttachment(
    user: AuthUser,
    id: string,
    diagnosisId: string,
    attachmentId: string,
  ) {
    return this.patientRepository.getDiagnosisAttachment(
      user,
      id,
      diagnosisId,
      attachmentId,
    );
  }

  addPrescription(
    user: AuthUser,
    id: string,
    input: PatientPrescriptionCommand,
  ) {
    return this.patientRepository.addPrescription(user, id, input);
  }

  addFinancialEntry(
    user: AuthUser,
    id: string,
    input: PatientFinancialEntryCommand,
  ) {
    return this.patientRepository.addFinancialEntry(user, id, input);
  }

  addExam(user: AuthUser, id: string, input: PatientExamCommand) {
    return this.patientRepository.addExam(user, id, input);
  }

  getExamFile(user: AuthUser, id: string, examId: string) {
    return this.patientRepository.getExamFile(user, id, examId);
  }

  create(user: AuthUser, input: PatientCreateCommand) {
    return this.patientRepository.create(user, input);
  }

  update(user: AuthUser, id: string, input: PatientUpdateCommand) {
    return this.patientRepository.update(user, id, input);
  }

  setStatus(user: AuthUser, id: string, input: PatientStatusCommand) {
    return this.patientRepository.setStatus(user, id, input);
  }

  remove(user: AuthUser, id: string) {
    return this.patientRepository.remove(user, id);
  }
}
