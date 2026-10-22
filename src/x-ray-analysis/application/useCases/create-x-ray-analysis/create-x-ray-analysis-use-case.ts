import {
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AuthUser } from '../../../../auth/auth-user';
import {
  CreateXRayAnalysisRecord,
  IXRayAnalysisRepository,
} from '../../../domain/x-ray-analysis.repository';
import { IXRayAnalyzer } from '../../../domain/x-ray-analyzer.interface';
import { IXRayFileStorage } from '../../../domain/x-ray-file-storage.interface';
import { XRayType, XRayUpload } from '../../../domain/x-ray-analysis.entity';
import { XRayAnalysisAccessPolicy } from '../../x-ray-analysis-access.policy';

export type CreateXRayAnalysisInput = {
  user: AuthUser;
  patientId: string;
  type: XRayType;
  region: string;
  file: XRayUpload;
};

export class CreateXRayAnalysisUseCase {
  private readonly logger = new Logger(CreateXRayAnalysisUseCase.name);

  constructor(
    private readonly repository: IXRayAnalysisRepository,
    private readonly storage: IXRayFileStorage,
    private readonly analyzer: IXRayAnalyzer,
  ) {}

  async execute({
    user,
    patientId,
    type,
    region,
    file,
  }: CreateXRayAnalysisInput) {
    XRayAnalysisAccessPolicy.ensureCanAccess(user);
    if (!(await this.repository.patientExists(user, patientId))) {
      throw new NotFoundException('Patient not found');
    }

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
        type,
        region,
      );
      const record: CreateXRayAnalysisRecord = {
        patientId,
        type,
        region,
        fileName: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size,
        storageKey,
        analysis: result,
        modelName,
      };
      return await this.repository.create(user, record);
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
}
