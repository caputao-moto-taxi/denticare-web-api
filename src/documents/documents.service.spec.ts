import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { AuthUser } from '../auth/auth-user';
import { PatientExamStorage } from '../patients/infra/storage/patient-exam-storage';
import { PrismaService } from '../shared/infra/db/prisma/prisma.service';
import { CreatePatientDocumentDto } from './documents.dto';
import { DocumentsService } from './documents.service';
import { PatientDocumentPdfService } from './patient-document-pdf.service';

describe('DocumentsService', () => {
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

  it('requires and trims the fields that belong to the selected document type', () => {
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

  function createService(logoKey: string | null = null) {
    const prisma = {
      person: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            { id: 'patient-a', firstName: 'Ana', lastName: 'Silva' },
          ]),
        count: jest.fn().mockResolvedValue(1),
        findFirst: jest.fn().mockResolvedValue({
          id: 'patient-a',
          firstName: 'Ana',
          lastName: 'Silva',
        }),
      },
      user: {
        findFirst: jest.fn().mockResolvedValue({ username: 'Dra. Maria' }),
      },
      branch: {
        findFirst: jest.fn().mockResolvedValue({
          name: 'Clínica DentCare',
          headquarter: { logo: logoKey },
        }),
      },
      patientDocument: {
        create: jest.fn().mockResolvedValue({
          id: 'document-a',
          patientId: 'patient-a',
          type: input.type,
          formData: input,
          fileName: 'justificativo_falta-2026-10-22.pdf',
          createdAt: new Date('2026-10-22T10:00:00.000Z'),
        }),
      },
    } as unknown as PrismaService;
    const pdf = {
      generate: jest.fn().mockResolvedValue(pdfBytes),
    } as unknown as PatientDocumentPdfService;
    const storage = {
      get: jest.fn().mockResolvedValue({
        data: Buffer.from('clinic-logo'),
        mime_type: 'image/png',
      }),
    };
    return {
      service: new DocumentsService(
        prisma,
        pdf,
        storage as unknown as PatientExamStorage,
      ),
      prisma,
      pdf,
      storage,
    };
  }

  it('searches patients by every name term within the active branch', async () => {
    const { service, prisma } = createService();

    const result = await service.listPatients(user, {
      search: 'Ana Silva',
      page: 1,
      pageSize: 100,
    });

    expect(result.data).toEqual([{ id: 'patient-a', name: 'Ana Silva' }]);
    expect(prisma.person.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          branchId: user.branchId,
          AND: [
            {
              OR: [
                {
                  firstName: {
                    contains: 'Ana',
                    mode: 'insensitive',
                  },
                },
                {
                  lastName: {
                    contains: 'Ana',
                    mode: 'insensitive',
                  },
                },
              ],
            },
            {
              OR: [
                {
                  firstName: {
                    contains: 'Silva',
                    mode: 'insensitive',
                  },
                },
                {
                  lastName: {
                    contains: 'Silva',
                    mode: 'insensitive',
                  },
                },
              ],
            },
          ],
        }),
      }),
    );
  });

  it('previews a validated document without persisting it', async () => {
    const { service, prisma, pdf } = createService();

    const result = await service.preview(user, input);

    expect(result.pdfBytes).toEqual(pdfBytes);
    expect(result.fileName).toMatch(
      /^justificativo_falta-\d{4}-\d{2}-\d{2}\.pdf$/,
    );
    expect(pdf.generate).toHaveBeenCalledWith(
      expect.objectContaining({
        patientName: 'Ana Silva',
        authorName: 'Dra. Maria',
        branchName: 'Clínica DentCare',
      }),
    );
    expect(prisma.patientDocument.create).not.toHaveBeenCalled();
  });

  it('persists generated documents under the authenticated branch', async () => {
    const { service, prisma } = createService();

    const result = await service.generate(user, input);

    expect(result).toMatchObject({
      id: 'document-a',
      patientName: 'Ana Silva',
      authorName: 'Dra. Maria',
    });
    expect(prisma.patientDocument.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          patientId: 'patient-a',
          authorId: user.id,
          branchId: user.branchId,
          pdfBytes,
        }),
      }),
    );
  });

  it('loads the clinic logo for a medical justification PDF', async () => {
    const { service, pdf, storage } = createService(
      'headquarters/branch-a/logo/logo.png',
    );

    await service.preview(user, input);

    expect(storage.get).toHaveBeenCalledWith(
      'headquarters/branch-a/logo/logo.png',
    );
    expect(pdf.generate).toHaveBeenCalledWith(
      expect.objectContaining({
        clinicLogo: {
          data: Buffer.from('clinic-logo'),
          mime_type: 'image/png',
        },
      }),
    );
  });
});
