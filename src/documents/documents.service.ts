import { Injectable } from '@nestjs/common';
import { AuthUser } from '../auth/auth-user';
import {
  CreatePatientDocumentDto,
  ListDocumentPatientsDto,
  ListPatientDocumentsDto,
} from './documents.dto';
import { DocumentsUseCases } from './application/documents.use-cases';

@Injectable()
export class DocumentsService {
  constructor(private readonly useCases: DocumentsUseCases) {}

  listPatients(user: AuthUser, query: ListDocumentPatientsDto) {
    return this.useCases.listPatients(user, query);
  }

  list(user: AuthUser, query: ListPatientDocumentsDto) {
    return this.useCases.list(user, query);
  }

  generate(user: AuthUser, input: CreatePatientDocumentDto) {
    return this.useCases.generate(user, input);
  }

  preview(user: AuthUser, input: CreatePatientDocumentDto) {
    return this.useCases.preview(user, input);
  }

  getPdf(user: AuthUser, id: string) {
    return this.useCases.getPdf(user, id);
  }
}
