import { AuthUser } from '../../../../auth/auth-user';
import { IPatientFileStorage } from '../../interfaces/patient-file-storage.interface';
import { IPatientRepository } from '../../../domain/patient.repository';
import { AddPatientExamUseCase } from './add-patient-exam-use-case';

const doctor: AuthUser = {
  id: 'doctor-1',
  email: 'doctor@example.test',
  role: 'doctor',
  branchId: 'branch-1',
  permissions: ['patients.clinical.write'],
};

const exam = {
  title: 'Radiografia panorâmica',
  type: 'Panorâmica',
  doctorName: 'Dra. Ana',
  file: {
    originalname: 'exame.pdf',
    mimetype: 'application/pdf',
    size: 1024 * 1024,
    buffer: Buffer.from('file'),
  },
};

describe('AddPatientExamUseCase', () => {
  it('stores the file and persists normalized metadata', async () => {
    const repository = {
      addExam: jest.fn().mockImplementation(async (_user, _patientId, input) => ({
        id: 'exam-1',
        ...input,
        createdAt: new Date('2026-10-26T09:00:00.000Z'),
      })),
    };
    const fileStorage = { store: jest.fn(), delete: jest.fn() };
    const useCase = new AddPatientExamUseCase(
      repository as unknown as IPatientRepository,
      fileStorage as unknown as IPatientFileStorage,
    );

    const result = await useCase.execute({ user: doctor, id: 'patient-1', exam });

    expect(fileStorage.store).toHaveBeenCalledWith({
      id: expect.stringMatching(/^[0-9a-f-]{36}$/),
      data: exam.file.buffer,
      mimeType: exam.file.mimetype,
    });
    expect(repository.addExam).toHaveBeenCalledWith(
      doctor,
      'patient-1',
      expect.objectContaining({
        title: exam.title,
        doctorName: exam.doctorName,
        fileName: exam.file.originalname,
        mimeType: exam.file.mimetype,
        fileSize: exam.file.size,
        storageKey: expect.stringMatching(/^[0-9a-f-]{36}$/),
      }),
    );
    expect(result).toMatchObject({
      id: 'exam-1',
      date: '2026-10-26T09:00:00.000Z',
      fileSize: '1.0 MB',
    });
    expect(fileStorage.delete).not.toHaveBeenCalled();
  });

  it('deletes the uploaded file if the database write fails', async () => {
    const repository = { addExam: jest.fn().mockRejectedValue(new Error('db')) };
    const fileStorage = { store: jest.fn(), delete: jest.fn() };
    const useCase = new AddPatientExamUseCase(
      repository as unknown as IPatientRepository,
      fileStorage as unknown as IPatientFileStorage,
    );

    await expect(
      useCase.execute({ user: doctor, id: 'patient-1', exam }),
    ).rejects.toThrow('db');

    expect(fileStorage.delete).toHaveBeenCalledWith(
      expect.stringMatching(/^[0-9a-f-]{36}$/),
    );
  });
});
