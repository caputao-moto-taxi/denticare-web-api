import { AuthUser } from '../../../../auth/auth-user';
import { IPatientFileStorage } from '../../interfaces/patient-file-storage.interface';
import { IPatientRepository } from '../../../domain/patient.repository';
import { AddPatientDiagnosisAttachmentsUseCase } from './add-patient-diagnosis-attachments-use-case';

const doctor: AuthUser = {
  id: 'doctor-1',
  email: 'doctor@example.test',
  role: 'doctor',
  branchId: 'branch-1',
  permissions: ['patients.clinical.write'],
};

const files = [
  {
    originalname: 'xray.png',
    mimetype: 'image/png',
    size: 12,
    buffer: Buffer.from('image'),
  },
];

describe('AddPatientDiagnosisAttachmentsUseCase', () => {
  it('stores files and persists only attachment metadata', async () => {
    const repository = {
      addDiagnosisAttachments: jest
        .fn()
        .mockImplementation(async (_user, _patientId, _diagnosisId, stored) =>
          stored.map((file, index) => ({
            id: `attachment-${index + 1}`,
            fileName: file.originalname,
            mimeType: file.mimetype,
            fileSize: file.size,
          })),
        ),
    };
    const fileStorage = { store: jest.fn(), delete: jest.fn() };
    const useCase = new AddPatientDiagnosisAttachmentsUseCase(
      repository as unknown as IPatientRepository,
      fileStorage as unknown as IPatientFileStorage,
    );

    const result = await useCase.execute({
      user: doctor,
      id: 'patient-1',
      diagnosisId: 'diagnosis-1',
      files,
    });

    expect(fileStorage.store).toHaveBeenCalledWith({
      id: expect.stringMatching(/^[0-9a-f-]{36}$/),
      data: files[0].buffer,
      mimeType: files[0].mimetype,
    });
    expect(repository.addDiagnosisAttachments).toHaveBeenCalledWith(
      doctor,
      'patient-1',
      'diagnosis-1',
      [
        expect.objectContaining({
          originalname: 'xray.png',
          mimetype: 'image/png',
          size: 12,
          storageKey: expect.stringMatching(/^[0-9a-f-]{36}$/),
        }),
      ],
    );
    expect(result).toEqual([
      {
        id: 'attachment-1',
        fileName: 'xray.png',
        mimeType: 'image/png',
        fileSize: 12,
      },
    ]);
  });

  it('cleans up previously uploaded files when a later upload fails', async () => {
    const repository = { addDiagnosisAttachments: jest.fn() };
    const fileStorage = {
      store: jest
        .fn()
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('storage failed')),
      delete: jest.fn(),
    };
    const useCase = new AddPatientDiagnosisAttachmentsUseCase(
      repository as unknown as IPatientRepository,
      fileStorage as unknown as IPatientFileStorage,
    );

    await expect(
      useCase.execute({
        user: doctor,
        id: 'patient-1',
        diagnosisId: 'diagnosis-1',
        files: [...files, { ...files[0], originalname: 'second.png' }],
      }),
    ).rejects.toThrow('storage failed');

    expect(fileStorage.delete).toHaveBeenCalledWith(
      expect.stringMatching(/^[0-9a-f-]{36}$/),
    );
    expect(repository.addDiagnosisAttachments).not.toHaveBeenCalled();
  });
});
