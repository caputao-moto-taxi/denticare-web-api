import { joinName } from '../../shared/helpers/staff';
import {
  PatientDiagnosisCommand,
  PatientDiagnosisPersistenceCommand,
  PatientDiagnosisRecord,
} from '../domain/patient.repository';

export function normalizePatientDiagnosis(
  diagnosis: PatientDiagnosisCommand,
): PatientDiagnosisPersistenceCommand {
  return {
    code: diagnosis.code?.trim() || undefined,
    designation: diagnosis.title.trim(),
    description: diagnosis.description.trim(),
    severity: diagnosis.severity,
    status: diagnosis.status,
    affectedTeeth: diagnosis.affectedTeeth?.map(String) ?? [],
  };
}

export function toPatientDiagnosisView(diagnosis: PatientDiagnosisRecord) {
  return {
    id: diagnosis.id,
    code: diagnosis.code ?? '',
    title: diagnosis.designation,
    affectedTeeth: diagnosis.affectedTeeth,
    diagnosedAt: diagnosis.createdAt.toISOString(),
    doctorName: joinName(diagnosis.doctor.Person[0], 'Profissional'),
    severity: diagnosis.severity,
    status: diagnosis.status,
    description: diagnosis.description ?? '',
    attachments: diagnosis.attachments.map((attachment) => ({
      id: attachment.id,
      fileName: attachment.fileName,
      mimeType: attachment.mimeType,
      fileSize: attachment.fileSize,
    })),
  };
}