import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AuthUser } from '../../auth/auth-user';
import { PatientExamStorage } from '../../patients/infra/storage/patient-exam-storage';
import {
  CreatePatientDocumentDto,
  ListDocumentPatientsDto,
  ListPatientDocumentsDto,
} from '../documents.dto';
import { IDocumentsRepository } from '../domain/documents.repository';
import { PatientDocumentPdfService } from '../patient-document-pdf.service';

@Injectable()
export class DocumentsUseCases {
  constructor(
    private readonly repository: IDocumentsRepository,
    private readonly pdf: PatientDocumentPdfService,
    private readonly storage: PatientExamStorage,
  ) {}

  async listPatients(user: AuthUser, query: ListDocumentPatientsDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 100;
    const { data, total } = await this.repository.listPatients(
      user.branchId,
      query,
    );
    return {
      data: data.map((patient) => ({
        id: patient.id,
        name: `${patient.firstName} ${patient.lastName}`.trim(),
      })),
      meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async list(user: AuthUser, query: ListPatientDocumentsDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    const { data, total } = await this.repository.list(user.branchId, query);
    return {
      data: data.map((document) => ({
        ...document,
        patientName: `${document.patient.firstName} ${document.patient.lastName}`,
        authorName: document.author.username,
      })),
      meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async generate(user: AuthUser, input: CreatePatientDocumentDto) {
    const data = await this.documentData(user, input);
    const id = randomUUID();
    const fileName = this.fileName(input.type, data.createdAt);
    const document = await this.repository.create({
      id,
      patientId: data.patientId,
      authorId: user.id,
      branchId: user.branchId,
      type: input.type,
      formData: input,
      pdfBytes: data.pdfBytes,
      fileName,
      createdAt: data.createdAt,
    });
    return {
      ...document,
      patientName: data.patientName,
      authorName: data.authorName,
    };
  }

  async preview(user: AuthUser, input: CreatePatientDocumentDto) {
    const data = await this.documentData(user, input);
    return {
      fileName: this.fileName(input.type, data.createdAt),
      pdfBytes: data.pdfBytes,
    };
  }

  async getPdf(user: AuthUser, id: string) {
    const document = await this.repository.getPdf(id, user.branchId);
    if (!document) throw new NotFoundException('Document not found');
    return document;
  }

  private fileName(type: string, createdAt: Date) {
    return `${type.toLowerCase()}-${createdAt.toISOString().slice(0, 10)}.pdf`;
  }

  private async documentData(user: AuthUser, input: CreatePatientDocumentDto) {
    const patient = await this.repository.findPatient(
      input.patientId,
      user.branchId,
    );
    if (!patient) {
      throw new NotFoundException('Patient not found in the active branch');
    }

    const [author, branch] = await Promise.all([
      this.repository.findAuthor(user.id, user.branchId),
      this.repository.findBranch(user.branchId),
    ]);
    if (!author || !branch) {
      throw new ForbiddenException('Active branch access is required');
    }

    const createdAt = new Date();
    const patientName = `${patient.firstName} ${patient.lastName}`;
    const logoKey = branch.headquarter.logo;
    const clinicLogo =
      input.type === 'JUSTIFICATIVO_FALTA' &&
      logoKey?.startsWith('headquarters/')
        ? await this.storage.get(logoKey)
        : undefined;
    const pdfBytes = await this.pdf.generate({
      type: input.type,
      patientName,
      authorName: author.username,
      branchName: branch.name,
      clinicLogo,
      issuedAt: createdAt,
      formData: input,
    });
    return {
      patientId: patient.id,
      patientName,
      authorName: author.username,
      createdAt,
      pdfBytes,
    };
  }
}
