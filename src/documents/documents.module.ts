import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PatientsModule } from '../patients/patients.module';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { PatientDocumentPdfService } from './patient-document-pdf.service';

@Module({
  imports: [AuthModule, PatientsModule],
  controllers: [DocumentsController],
  providers: [DocumentsService, PatientDocumentPdfService],
})
export class DocumentsModule {}
