import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AuthUser } from '../auth/auth-user';
import { PatientExamStorage } from '../patients/infra/storage/patient-exam-storage';
import { PrismaService } from '../shared/infra/db/prisma/prisma.service';
import {
  CreatePatientDocumentDto,
  ListDocumentPatientsDto,
  ListPatientDocumentsDto,
} from './documents.dto';
import { PatientDocumentPdfService } from './patient-document-pdf.service';

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pdf: PatientDocumentPdfService,
    private readonly storage: PatientExamStorage,
  ) {}

  async listPatients(user: AuthUser, query: ListDocumentPatientsDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 100;
    const searchTerms = query.search?.trim().split(/\s+/).filter(Boolean);
    const where = {
      branchId: user.branchId,
      deletedAt: null,
      ...(searchTerms?.length && {
        AND: searchTerms.map((searchTerm) => ({
          OR: [
            {
              firstName: {
                contains: searchTerm,
                mode: 'insensitive' as const,
              },
            },
            {
              lastName: {
                contains: searchTerm,
                mode: 'insensitive' as const,
              },
            },
          ],
        })),
      }),
    };
    const [patients, total] = await Promise.all([
      this.prisma.person.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
        select: { id: true, firstName: true, lastName: true },
      }),
      this.prisma.person.count({ where }),
    ]);

    return {
      data: patients.map((patient) => ({
        id: patient.id,
        name: `${patient.firstName} ${patient.lastName}`.trim(),
      })),
      meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async list(user: AuthUser, query: ListPatientDocumentsDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    const where = {
      branchId: user.branchId,
      ...(query.patientId && { patientId: query.patientId }),
    };
    const [documents, total] = await Promise.all([
      this.prisma.patientDocument.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          patientId: true,
          type: true,
          formData: true,
          fileName: true,
          createdAt: true,
          patient: { select: { firstName: true, lastName: true } },
          author: { select: { username: true } },
        },
      }),
      this.prisma.patientDocument.count({ where }),
    ]);

    return {
      data: documents.map((document) => ({
        ...document,
        patientName: `${document.patient.firstName} ${document.patient.lastName}`,
        authorName: document.author.username,
      })),
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async generate(user: AuthUser, input: CreatePatientDocumentDto) {
    const documentData = await this.documentData(user, input);
    const id = randomUUID();
    const dateLabel = documentData.createdAt.toISOString().slice(0, 10);
    const fileName = `${input.type.toLowerCase()}-${dateLabel}.pdf`;
    const document = await this.prisma.patientDocument.create({
      data: {
        id,
        patientId: documentData.patientId,
        authorId: user.id,
        branchId: user.branchId,
        type: input.type,
        formData: JSON.parse(JSON.stringify(input)),
        pdfBytes: Uint8Array.from(documentData.pdfBytes),
        fileName,
        createdAt: documentData.createdAt,
      },
      select: {
        id: true,
        patientId: true,
        type: true,
        formData: true,
        fileName: true,
        createdAt: true,
      },
    });

    return {
      ...document,
      patientName: documentData.patientName,
      authorName: documentData.authorName,
    };
  }

  async preview(user: AuthUser, input: CreatePatientDocumentDto) {
    const documentData = await this.documentData(user, input);
    const dateLabel = documentData.createdAt.toISOString().slice(0, 10);
    return {
      fileName: `${input.type.toLowerCase()}-${dateLabel}.pdf`,
      pdfBytes: documentData.pdfBytes,
    };
  }

  private async documentData(user: AuthUser, input: CreatePatientDocumentDto) {
    const patient = await this.prisma.person.findFirst({
      where: {
        id: input.patientId,
        branchId: user.branchId,
        deletedAt: null,
      },
      select: { id: true, firstName: true, lastName: true },
    });
    if (!patient) {
      throw new NotFoundException('Patient not found in the active branch');
    }

    const [author, branch] = await Promise.all([
      this.prisma.user.findFirst({
        where: { id: user.id, branchId: user.branchId, deletedAt: null },
        select: { username: true },
      }),
      this.prisma.branch.findFirst({
        where: { id: user.branchId, deletedAt: null },
        select: { name: true, headquarter: { select: { logo: true } } },
      }),
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

  async getPdf(user: AuthUser, id: string) {
    const document = await this.prisma.patientDocument.findFirst({
      where: { id, branchId: user.branchId },
      select: { pdfBytes: true, fileName: true },
    });
    if (!document) throw new NotFoundException('Document not found');
    return document;
  }
}
