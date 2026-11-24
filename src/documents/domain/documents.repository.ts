import {
  CreatePatientDocumentDto,
  ListDocumentPatientsDto,
  ListPatientDocumentsDto,
} from '../documents.dto';

export type DocumentPatientRecord = {
  id: string;
  firstName: string;
  lastName: string;
};

export type DocumentListRecord = {
  id: string;
  patientId: string;
  type: string;
  formData: unknown;
  fileName: string;
  createdAt: Date;
  patient: { firstName: string; lastName: string };
  author: { username: string };
};

export type PatientDocumentContext = {
  id: string;
  firstName: string;
  lastName: string;
};

export type PatientDocumentAuthor = { username: string };
export type PatientDocumentBranch = {
  name: string;
  headquarter: { logo: string | null };
};

export abstract class IDocumentsRepository {
  abstract listPatients(
    branchId: string,
    query: ListDocumentPatientsDto,
  ): Promise<{ data: DocumentPatientRecord[]; total: number }>;
  abstract list(
    branchId: string,
    query: ListPatientDocumentsDto,
  ): Promise<{ data: DocumentListRecord[]; total: number }>;
  abstract findPatient(
    patientId: string,
    branchId: string,
  ): Promise<PatientDocumentContext | null>;
  abstract findAuthor(
    userId: string,
    branchId: string,
  ): Promise<PatientDocumentAuthor | null>;
  abstract findBranch(branchId: string): Promise<PatientDocumentBranch | null>;
  abstract create(input: {
    id: string;
    patientId: string;
    authorId: string;
    branchId: string;
    type: string;
    formData: CreatePatientDocumentDto;
    pdfBytes: Buffer;
    fileName: string;
    createdAt: Date;
  }): Promise<{
    id: string;
    patientId: string;
    type: string;
    formData: unknown;
    fileName: string;
    createdAt: Date;
  }>;
  abstract getPdf(
    id: string,
    branchId: string,
  ): Promise<{ pdfBytes: Uint8Array; fileName: string } | null>;
}
