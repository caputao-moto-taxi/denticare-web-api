import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../../generated/prisma/client';
import { AuthUser } from '../../../../auth/auth-user';
import {
  ListQuery,
  pageWindow,
  paginated,
} from '../../../../shared/domain/list-query';
import { dateRange } from '../../../../shared/helpers/list-filters';
import { PrismaService } from '../../../../shared/infra/db/prisma/prisma.service';
import { XRayAnalysisOutput } from '../../../domain/x-ray-analysis.entity';
import {
  CreateXRayAnalysisRecord,
  IXRayAnalysisRepository,
  XRayFileRecord,
} from '../../../domain/x-ray-analysis.repository';

const RESULT_SELECT = {
  patient: { select: { firstName: true, lastName: true } },
} as const;

@Injectable()
export class XRayAnalysisPrismaRepository implements IXRayAnalysisRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthUser, query: ListQuery) {
    const search = query.search?.trim();
    const where: Prisma.XRayAnalysisWhereInput = {
      branchId: user.branchId,
      ...(query.type && { type: query.type }),
      ...((query.dateFrom || query.dateTo) && {
        createdAt: dateRange(query),
      }),
      ...(search && {
        OR: [
          { region: { contains: search, mode: 'insensitive' } },
          { fileName: { contains: search, mode: 'insensitive' } },
          {
            patient: {
              firstName: { contains: search, mode: 'insensitive' },
            },
          },
          {
            patient: {
              lastName: { contains: search, mode: 'insensitive' },
            },
          },
        ],
      }),
    };

    const [records, total] = await this.prisma.$transaction([
      this.prisma.xRayAnalysis.findMany({
        where,
        include: RESULT_SELECT,
        orderBy: { createdAt: 'desc' },
        ...pageWindow(query),
      }),
      this.prisma.xRayAnalysis.count({ where }),
    ]);

    return paginated(
      records.map((record) => this.toResponse(record)),
      total,
      query,
    );
  }

  async patientExists(user: AuthUser, patientId: string) {
    const patient = await this.prisma.person.findFirst({
      where: {
        id: patientId,
        branchId: user.branchId,
        deletedAt: null,
        Role: { slug: 'patient' },
      },
      select: { id: true },
    });
    return Boolean(patient);
  }

  async create(user: AuthUser, input: CreateXRayAnalysisRecord) {
    const record = await this.prisma.xRayAnalysis.create({
      data: {
        patientId: input.patientId,
        branchId: user.branchId,
        analyzedById: user.id,
        type: input.type,
        region: input.region,
        fileName: input.fileName,
        mimeType: input.mimeType,
        fileSize: input.fileSize,
        storageKey: input.storageKey,
        analysis: input.analysis as Prisma.InputJsonValue,
        modelName: input.modelName,
      },
      include: RESULT_SELECT,
    });
    return this.toResponse(record);
  }

  findFile(user: AuthUser, id: string): Promise<XRayFileRecord | null> {
    return this.prisma.xRayAnalysis.findFirst({
      where: { id, branchId: user.branchId },
      select: { storageKey: true, mimeType: true, fileName: true },
    });
  }

  private toResponse(record: {
    id: string;
    patientId: string;
    type: string;
    region: string;
    fileName: string;
    fileSize: number;
    analysis: Prisma.JsonValue;
    modelName: string;
    createdAt: Date;
    patient: { firstName: string; lastName: string };
  }): XRayAnalysisOutput {
    return {
      id: record.id,
      patientId: record.patientId,
      patientName:
        `${record.patient.firstName} ${record.patient.lastName}`.trim(),
      type: record.type,
      region: record.region,
      fileName: record.fileName,
      fileSize: record.fileSize,
      analysis: record.analysis,
      modelName: record.modelName,
      status: 'analyzed',
      date: record.createdAt.toISOString(),
    };
  }
}
