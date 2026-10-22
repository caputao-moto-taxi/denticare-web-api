import { NotFoundException } from '@nestjs/common';
import { AuthUser } from '../../../../auth/auth-user';
import { IXRayAnalysisRepository } from '../../../domain/x-ray-analysis.repository';
import { IXRayFileStorage } from '../../../domain/x-ray-file-storage.interface';
import { XRayAnalysisAccessPolicy } from '../../x-ray-analysis-access.policy';

export type GetXRayAnalysisFileInput = { user: AuthUser; id: string };

export class GetXRayAnalysisFileUseCase {
  constructor(
    private readonly repository: IXRayAnalysisRepository,
    private readonly storage: IXRayFileStorage,
  ) {}

  async execute({ user, id }: GetXRayAnalysisFileInput) {
    XRayAnalysisAccessPolicy.ensureCanAccess(user);
    const record = await this.repository.findFile(user, id);
    if (!record) throw new NotFoundException('X-ray analysis not found');
    const file = await this.storage.get(record.storageKey);
    return {
      data: file.data,
      mimeType: record.mimeType,
      fileName: record.fileName,
    };
  }
}
