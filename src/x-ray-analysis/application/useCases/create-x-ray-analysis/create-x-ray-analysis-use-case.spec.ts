import { NotFoundException } from '@nestjs/common';
import { AuthUser } from '../../../../auth/auth-user';
import { IXRayAnalysisRepository } from '../../../domain/x-ray-analysis.repository';
import { IXRayAnalyzer } from '../../../domain/x-ray-analyzer.interface';
import { IXRayFileStorage } from '../../../domain/x-ray-file-storage.interface';
import { CreateXRayAnalysisUseCase } from './create-x-ray-analysis-use-case';

describe('CreateXRayAnalysisUseCase', () => {
  const user: AuthUser = {
    id: 'doctor-1',
    email: 'doctor@example.test',
    role: 'doctor',
    branchId: 'branch-1',
  };
  const file = {
    originalname: 'image.png',
    mimetype: 'image/png' as const,
    size: 4,
    buffer: Buffer.from('image'),
  };
  const analysis = {
    summary: 'Findings require review',
    observations: [],
    imageQuality: { rating: 'adequate' as const, issues: [] },
    requiresProfessionalReview: true as const,
  };
  const output = { id: 'analysis-1' };
  const repository = {
    patientExists: jest.fn(),
    create: jest.fn(),
  };
  const storage = { store: jest.fn(), delete: jest.fn() };
  const analyzer = { analyze: jest.fn() };
  const useCase = new CreateXRayAnalysisUseCase(
    repository as unknown as IXRayAnalysisRepository,
    storage as unknown as IXRayFileStorage,
    analyzer as unknown as IXRayAnalyzer,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    repository.patientExists.mockResolvedValue(true);
    storage.store.mockResolvedValue(undefined);
    analyzer.analyze.mockResolvedValue({
      result: analysis,
      modelName: 'private-model',
    });
    repository.create.mockResolvedValue(output);
  });

  it('stores, analyzes and persists a patient X-ray', async () => {
    await expect(
      useCase.execute({
        user,
        patientId: 'patient-1',
        type: 'panoramic',
        region: 'upper jaw',
        file,
      }),
    ).resolves.toBe(output);

    const storageKey = storage.store.mock.calls[0][0].id;
    expect(storageKey).toEqual(expect.any(String));
    expect(analyzer.analyze).toHaveBeenCalledWith(
      file.buffer,
      file.mimetype,
      'panoramic',
      'upper jaw',
    );
    expect(repository.create).toHaveBeenCalledWith(
      user,
      expect.objectContaining({
        patientId: 'patient-1',
        storageKey,
        analysis,
        modelName: 'private-model',
      }),
    );
    expect(storage.delete).not.toHaveBeenCalled();
  });

  it('rejects unknown patients before storing the image', async () => {
    repository.patientExists.mockResolvedValue(false);

    await expect(
      useCase.execute({
        user,
        patientId: 'missing',
        type: 'panoramic',
        region: 'upper jaw',
        file,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(storage.store).not.toHaveBeenCalled();
    expect(analyzer.analyze).not.toHaveBeenCalled();
  });

  it('removes the stored image when analysis or persistence fails', async () => {
    analyzer.analyze.mockRejectedValue(new Error('analysis failed'));

    await expect(
      useCase.execute({
        user,
        patientId: 'patient-1',
        type: 'panoramic',
        region: 'upper jaw',
        file,
      }),
    ).rejects.toThrow('analysis failed');

    expect(storage.delete).toHaveBeenCalledWith(
      storage.store.mock.calls[0][0].id,
    );
    expect(repository.create).not.toHaveBeenCalled();
  });
});
