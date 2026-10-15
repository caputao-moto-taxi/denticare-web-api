import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma } from '../../generated/prisma/client';
import { AuthUser } from '../auth/auth-user';
import { PatientExamStorage } from '../patients/infra/storage/patient-exam-storage';
import { PrismaService } from '../shared/infra/db/prisma/prisma.service';
import { ListQuery, pageWindow, paginated } from '../shared/domain/list-query';
import { dateRange, validateListFilters } from '../shared/helpers/list-filters';
import { CreateXRayAnalysisDto, XRAY_TYPES } from './x-ray-analysis.dto';
import { XRayAiAnalyzer } from './xray-ai-analyzer';

const XRAY_STAFF_ROLES = new Set(['admin', 'doctor', 'nurse']);
const RESULT_SELECT = {
  patient: { select: { firstName: true, lastName: true } },
} as const;

type XRayUpload = {
  originalname: string;
  mimetype: 'image/jpeg' | 'image/png';
  size: number;
  buffer: Buffer;
};

@Injectable()
export class XRayAnalysisService {
  private readonly logger = new Logger(XRayAnalysisService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: PatientExamStorage,
    private readonly analyzer: XRayAiAnalyzer,
  ) {}

  async list(user: AuthUser, query: ListQuery) {
    this.requireClinicalStaff(user);
    validateListFilters(query, { type: XRAY_TYPES });

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

  async create(user: AuthUser, input: CreateXRayAnalysisDto, file: XRayUpload) {
    this.requireClinicalStaff(user);
    const patient = await this.prisma.person.findFirst({
      where: {
        id: input.patientId,
        branchId: user.branchId,
        deletedAt: null,
        Role: { slug: 'patient' },
      },
      select: { id: true },
    });
    if (!patient) throw new NotFoundException('Patient not found');

    const storageKey = randomUUID();
    await this.storage.store({
      id: storageKey,
      data: file.buffer,
      mimeType: file.mimetype,
    });

    try {
      const { result, modelName } = await this.analyzer.analyze(
        file.buffer,
        file.mimetype,
        input.type,
        input.region,
      );
      const record = await this.prisma.xRayAnalysis.create({
        data: {
          patientId: patient.id,
          branchId: user.branchId,
          analyzedById: user.id,
          type: input.type,
          region: input.region,
          fileName: file.originalname,
          mimeType: file.mimetype,
          fileSize: file.size,
          storageKey,
          analysis: result as Prisma.InputJsonValue,
          modelName,
        },
        include: RESULT_SELECT,
      });
      return this.toResponse(record);
    } catch (error) {
      try {
        await this.storage.delete(storageKey);
      } catch (cleanupError) {
        this.logger.error(
          `Could not remove X-ray upload ${storageKey} after analysis failed`,
          cleanupError instanceof Error ? cleanupError.stack : undefined,
        );
        this.logger.error(
          'X-ray analysis or persistence failed before cleanup completed',
          error instanceof Error ? error.stack : undefined,
        );
        throw new InternalServerErrorException(
          'X-ray analysis failed and the uploaded file could not be removed',
        );
      }
      throw error;
    }
  }

  async getFile(user: AuthUser, id: string) {
    this.requireClinicalStaff(user);
    const record = await this.prisma.xRayAnalysis.findFirst({
      where: { id, branchId: user.branchId },
      select: { storageKey: true, mimeType: true, fileName: true },
    });
    if (!record) throw new NotFoundException('X-ray analysis not found');
    const file = await this.storage.get(record.storageKey);
    return {
      data: file.data,
      mimeType: record.mimeType,
      fileName: record.fileName,
    };
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
  }) {
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
      status: 'analyzed' as const,
      date: record.createdAt.toISOString(),
    };
  }

  private requireClinicalStaff(user: AuthUser) {
    if (!XRAY_STAFF_ROLES.has(user.role)) {
      throw new ForbiddenException(
        'Only clinical staff may access X-ray analyses',
      );
    }
  }
}
