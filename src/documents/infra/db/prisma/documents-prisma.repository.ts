import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infra/db/prisma/prisma.service';
import {
  CreatePatientDocumentDto,
  ListDocumentPatientsDto,
  ListPatientDocumentsDto,
} from '../../../documents.dto';
import {
  DocumentListRecord,
  DocumentPatientRecord,
  IDocumentsRepository,
  PatientDocumentBranch,
  PatientDocumentContext,
  PatientDocumentAuthor,
} from '../../../domain/documents.repository';

@Injectable()
export class DocumentsPrismaRepository implements IDocumentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listPatients(branchId: string, query: ListDocumentPatientsDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 100;
    const searchTerms = query.search?.trim().split(/\s+/).filter(Boolean);
    const where = {
      branchId,
      deletedAt: null,
      ...(searchTerms?.length && {
        AND: searchTerms.map((searchTerm) => ({
          OR: [
            {
              firstName: { contains: searchTerm, mode: 'insensitive' as const },
            },
            {
              lastName: { contains: searchTerm, mode: 'insensitive' as const },
            },
          ],
        })),
      }),
    };
    const [data, total] = await Promise.all([
      this.prisma.person.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
        select: { id: true, firstName: true, lastName: true },
      }),
      this.prisma.person.count({ where }),
    ]);
    return { data: data as DocumentPatientRecord[], total };
  }

  async list(branchId: string, query: ListPatientDocumentsDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    const where = {
      branchId,
      ...(query.patientId && { patientId: query.patientId }),
    };
    const [data, total] = await Promise.all([
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
    return { data: data as DocumentListRecord[], total };
  }

  findPatient(patientId: string, branchId: string) {
    return this.prisma.person.findFirst({
      where: { id: patientId, branchId, deletedAt: null },
      select: { id: true, firstName: true, lastName: true },
    }) as Promise<PatientDocumentContext | null>;
  }

  findAuthor(userId: string, branchId: string) {
    return this.prisma.user.findFirst({
      where: { id: userId, branchId, deletedAt: null },
      select: { username: true },
    }) as Promise<PatientDocumentAuthor | null>;
  }

  findBranch(branchId: string) {
    return this.prisma.branch.findFirst({
      where: { id: branchId, deletedAt: null },
      select: { name: true, headquarter: { select: { logo: true } } },
    }) as Promise<PatientDocumentBranch | null>;
  }

  create(input: {
    id: string;
    patientId: string;
    authorId: string;
    branchId: string;
    type: string;
    formData: CreatePatientDocumentDto;
    pdfBytes: Buffer;
    fileName: string;
    createdAt: Date;
  }) {
    return this.prisma.patientDocument.create({
      data: {
        ...input,
        formData: JSON.parse(JSON.stringify(input.formData)),
        pdfBytes: Uint8Array.from(input.pdfBytes),
      },
      select: {
        id: true,
        patientId: true,
        type: true,
        formData: true,
        fileName: true,
        createdAt: true,
      },
    }) as Promise<{
      id: string;
      patientId: string;
      type: string;
      formData: unknown;
      fileName: string;
      createdAt: Date;
    }>;
  }

  getPdf(id: string, branchId: string) {
    return this.prisma.patientDocument.findFirst({
      where: { id, branchId },
      select: { pdfBytes: true, fileName: true },
    }) as Promise<{ pdfBytes: Uint8Array; fileName: string } | null>;
  }
}
