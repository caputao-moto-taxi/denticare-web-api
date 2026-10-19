import { AuthUser } from '../../../../auth/auth-user';
import { IXRayAnalysisRepository } from '../../../domain/x-ray-analysis.repository';
import { IXRayFileStorage } from '../../../domain/x-ray-file-storage.interface';
import { GetXRayAnalysisFileUseCase } from './get-x-ray-analysis-file-use-case';

describe('GetXRayAnalysisFileUseCase', () => {
  const user: AuthUser = {
    id: 'doctor-1',
    email: 'doctor@example.test',
    role: 'doctor',
    branchId: 'branch-1',
  };
  const file = Buffer.from('image');
  const repository = { findFile: jest.fn() };
  const storage = { get: jest.fn() };
  const useCase = new GetXRayAnalysisFileUseCase(
    repository as unknown as IXRayAnalysisRepository,
    storage as unknown as IXRayFileStorage,
  );

  it('fetches a branch-scoped file and returns its metadata', async () => {
    repository.findFile.mockResolvedValue({
      storageKey: 'storage-key',
      mimeType: 'image/png',
      fileName: 'image.png',
    });
    storage.get.mockResolvedValue({ data: file });

    await expect(useCase.execute({ user, id: 'analysis-1' })).resolves.toEqual({
      data: file,
      mimeType: 'image/png',
      fileName: 'image.png',
    });
    expect(repository.findFile).toHaveBeenCalledWith(user, 'analysis-1');
    expect(storage.get).toHaveBeenCalledWith('storage-key');
  });
});
