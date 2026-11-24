import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { AuthUser } from '../auth/auth-user';
import { CreatePatientDocumentDto } from './documents.dto';
import { IDocumentsRepository } from './domain/documents.repository';
import { DocumentsUseCases } from './application/documents.use-cases';
import { PatientDocumentPdfService } from './patient-document-pdf.service';
import { PatientExamStorage } from '../patients/infra/storage/patient-exam-storage';

describe('DocumentsUseCases', () => {
  const user: AuthUser = {
    id: 'user-a',
    email: 'staff@example.test',
    role: 'admin',
    branchId: 'branch-a',
  };
  const input = {
    patientId: 'patient-a',
    type: 'JUSTIFICATIVO_FALTA' as const,
    absenceDate: '2026-10-22',
    absenceReason: 'Consulta médica',
    recipient: 'Entidade empregadora',
  };
  const pdfBytes = Buffer.from('pdf-content');

  it('requires and trims fields belonging to the selected document type', () => {
    const invalid = plainToInstance(CreatePatientDocumentDto, {
      patientId: 'patient-a',
      type: 'JUSTIFICATIVO_FALTA',
      absenceDate: '2026-10-22',
      absenceReason: '   ',
    });
    const errors = validateSync(invalid);
    expect(errors.map((error) => error.property)).toContain('patientId');
    expect(errors.map((error) => error.property)).toContain('absenceReason');
    expect(errors.map((error) => error.property)).toContain('recipient');

    const validTerm = plainToInstance(CreatePatientDocumentDto, {
      patientId: '6578d345-7c41-47f4-a87a-e1b76c123456',
      type: 'TERMO_RESPONSABILIDADE',
      procedureName: 'Tratamento dentário',
      responsibleName: 'Ana Silva',
      responsibleDocument: '123456789',
      relationship: 'Mãe',
      responsibilityStatement: 'Assumo a responsabilidade pelo tratamento.',
    });
    expect(validateSync(validTerm)).toHaveLength(0);
  });

  function createUseCases(logo: string | null = null) {
    const repository = {
      listPatients: jest.fn().mockResolvedValue({
        data: [{ id: 'patient-a', firstName: 'Ana', lastName: 'Silva' }],
        total: 1,
      }),
      list: jest.fn().mockResolvedValue({ data: [], total: 0 }),
      findPatient: jest.fn().mockResolvedValue({
        id: 'patient-a',
        firstName: 'Ana',
        lastName: 'Silva',
      }),
      findAuthor: jest.fn().mockResolvedValue({ username: 'Dra. Maria' }),
      findBranch: jest.fn().mockResolvedValue({
        name: 'Clínica DentCare',
        headquarter: { logo },
      }),
      create: jest.fn().mockResolvedValue({
        id: 'document-a',
        patientId: 'patient-a',
        type: input.type,
        formData: input,
        fileName: 'justificativo_falta-2026-10-22.pdf',
        createdAt: new Date('2026-10-22T10:00:00.000Z'),
      }),
      getPdf: jest.fn(),
    } as unknown as IDocumentsRepository;
    const pdf = { generate: jest.fn().mockResolvedValue(pdfBytes) };
    const storage = {
      get: jest.fn().mockResolvedValue({
        data: Buffer.from('clinic-logo'),
        mime_type: 'image/png',
      }),
    };
    return {
      useCases: new DocumentsUseCases(
        repository,
        pdf as unknown as PatientDocumentPdfService,
        storage as unknown as PatientExamStorage,
      ),
      repository,
      pdf,
      storage,
    };
  }

  it('lists patients by the active branch and maps names for the API', async () => {
    const { useCases, repository } = createUseCases();
    const result = await useCases.listPatients(user, {
      search: 'Ana Silva',
      page: 1,
      pageSize: 100,
    });
    expect(result.data).toEqual([{ id: 'patient-a', name: 'Ana Silva' }]);
    expect(repository.listPatients).toHaveBeenCalledWith(
      user.branchId,
      expect.objectContaining({ search: 'Ana Silva' }),
    );
  });

  it('previews generated PDFs without persisting and loads only eligible clinic logos', async () => {
    const { useCases, repository, pdf, storage } = createUseCases(
      'headquarters/branch-a/logo/logo.png',
    );
    const result = await useCases.preview(user, input);
    expect(result.pdfBytes).toEqual(pdfBytes);
    expect(result.fileName).toMatch(
      /^justificativo_falta-\d{4}-\d{2}-\d{2}\.pdf$/,
    );
    expect(pdf.generate).toHaveBeenCalledWith(
      expect.objectContaining({
        patientName: 'Ana Silva',
        authorName: 'Dra. Maria',
        branchName: 'Clínica DentCare',
        clinicLogo: {
          data: Buffer.from('clinic-logo'),
          mime_type: 'image/png',
        },
      }),
    );
    expect(storage.get).toHaveBeenCalledWith(
      'headquarters/branch-a/logo/logo.png',
    );
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('persists generated documents under the authenticated branch', async () => {
    const { useCases, repository } = createUseCases();
    const result = await useCases.generate(user, input);
    expect(result).toMatchObject({
      id: 'document-a',
      patientName: 'Ana Silva',
      authorName: 'Dra. Maria',
    });
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        patientId: 'patient-a',
        authorId: user.id,
        branchId: user.branchId,
        pdfBytes,
      }),
    );
  });
});
