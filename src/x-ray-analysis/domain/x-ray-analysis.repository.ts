import { AuthUser } from '../../auth/auth-user';
import { ListQuery, PaginatedResult } from '../../shared/domain/list-query';
import {
  XRayAnalysisOutput,
  XRayAnalysisResult,
  XRayType,
} from './x-ray-analysis.entity';

export type CreateXRayAnalysisRecord = {
  patientId: string;
  type: XRayType;
  region: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  storageKey: string;
  analysis: XRayAnalysisResult;
  modelName: string;
};

export type XRayFileRecord = {
  storageKey: string;
  mimeType: string;
  fileName: string;
};

export abstract class IXRayAnalysisRepository {
  abstract list(
    user: AuthUser,
    query: ListQuery,
  ): Promise<PaginatedResult<XRayAnalysisOutput>>;
  abstract patientExists(user: AuthUser, patientId: string): Promise<boolean>;
  abstract create(
    user: AuthUser,
    input: CreateXRayAnalysisRecord,
  ): Promise<XRayAnalysisOutput>;
  abstract findFile(user: AuthUser, id: string): Promise<XRayFileRecord | null>;
}
