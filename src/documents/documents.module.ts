import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PatientsModule } from '../patients/patients.module';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { PatientDocumentPdfService } from './patient-document-pdf.service';
import { DocumentsUseCases } from './application/documents.use-cases';
import { DocumentsPrismaRepository } from './infra/db/prisma/documents-prisma.repository';
import { IDocumentsRepository } from './domain/documents.repository';
import { PatientExamStorage } from '../patients/infra/storage/patient-exam-storage';

@Module({
  imports: [AuthModule, PatientsModule],
  controllers: [DocumentsController],
  providers: [
    DocumentsService,
    PatientDocumentPdfService,
    DocumentsPrismaRepository,
    {
      provide: 'DocumentsRepository',
      useExisting: DocumentsPrismaRepository,
    },
    {
      provide: DocumentsUseCases,
      useFactory: (
        repository: IDocumentsRepository,
        pdf: PatientDocumentPdfService,
        storage: PatientExamStorage,
      ) => new DocumentsUseCases(repository, pdf, storage),
      inject: [
        'DocumentsRepository',
        PatientDocumentPdfService,
        PatientExamStorage,
      ],
    },
  ],
})
export class DocumentsModule {}
