import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { extname, basename } from 'node:path';
import { Response } from 'express';
import { AuthUser } from '../../../../auth/auth-user';
import { CurrentUser } from '../../../../auth/current-user.decorator';
import { JwtAuthGuard } from '../../../../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../../../auth/permissions.guard';
import { RequirePermissions } from '../../../../auth/permissions';
import { ListQueryDto } from '../../../../shared/infra/http/list-query.dto';
import {
  CreatePatientDto,
  UpdatePatientDto,
  UpdatePatientStatusDto,
} from './dtos/patient.dto';
import {
  CreatePatientDiagnosisDto,
  CreatePatientExamDto,
  CreatePatientFinancialEntryDto,
  CreatePatientPrescriptionDto,
  UpdatePatientToothDto,
  UpdatePatientDiagnosisDto,
} from './dtos/patient-details.dto';
import { PatientsUseCases } from '../../../application/useCases/patients.use-cases';
import { PatientPdfService } from '../../pdf/patient-pdf.service';

const EXAM_FILE_LIMIT = 100 * 1024 * 1024;
const DIAGNOSIS_ATTACHMENT_FILE_LIMIT = 20 * 1024 * 1024;
const DIAGNOSIS_ATTACHMENT_COUNT_LIMIT = 5;
const EXAM_FILE_TYPES: Record<string, string[]> = {
  '.dcm': ['application/dicom', 'application/octet-stream'],
  '.dicom': ['application/dicom', 'application/octet-stream'],
  '.jpg': ['image/jpeg'],
  '.jpeg': ['image/jpeg'],
  '.png': ['image/png'],
  '.pdf': ['application/pdf'],
  '.stl': ['model/stl', 'application/sla', 'application/octet-stream'],
};

type ExamUpload = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

@ApiTags('Patients')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('patients')
export class PatientsController {
  constructor(
    private readonly patientsService: PatientsUseCases,
    private readonly patientPdfService: PatientPdfService,
  ) {}

  @Get()
  @RequirePermissions('patients.read')
  list(@CurrentUser() user: AuthUser, @Query() query: ListQueryDto) {
    return this.patientsService.list(user, query);
  }

  @Get(':id')
  @RequirePermissions('patients.read')
  findOne(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.patientsService.findOne(user, id);
  }

  @Get(':id/details')
  @RequirePermissions('patients.read')
  details(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.patientsService.details(user, id);
  }

  @Get(':id/chart/pdf')
  @RequirePermissions('patients.read')
  async getPatientChartPdf(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() response: Response,
  ) {
    const data = await this.patientsService.getPatientChartPdfData(user, id);
    const pdf = await this.patientPdfService.createPatientChart(data);
    return this.sendPdf(response, pdf, `patient-chart-${id}.pdf`);
  }

  @Get(':id/prescriptions/:prescriptionId/pdf')
  @RequirePermissions('patients.clinical.read')
  async getPrescriptionPdf(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('prescriptionId', ParseUUIDPipe) prescriptionId: string,
    @Res() response: Response,
  ) {
    const data = await this.patientsService.getPrescriptionPdfData(
      user,
      id,
      prescriptionId,
    );
    const pdf = await this.patientPdfService.createPrescription(data);
    return this.sendPdf(response, pdf, `prescription-${prescriptionId}.pdf`);
  }

  @Get(':id/financials/:financialId/pdf')
  @RequirePermissions('patients.financial.read')
  async getFinancialPdf(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('financialId', ParseUUIDPipe) financialId: string,
    @Res() response: Response,
  ) {
    const data = await this.patientsService.getFinancialPdfData(
      user,
      id,
      financialId,
    );
    const pdf = await this.patientPdfService.createFinancialReceipt(data);
    return this.sendPdf(response, pdf, `financial-${financialId}.pdf`);
  }

  @Patch(':id/odontogram')
  @RequirePermissions('patients.clinical.write')
  updateTooth(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdatePatientToothDto,
  ) {
    return this.patientsService.updateTooth(user, id, input);
  }

  @Post(':id/diagnoses')
  @RequirePermissions('patients.clinical.write')
  addDiagnosis(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: CreatePatientDiagnosisDto,
  ) {
    return this.patientsService.addDiagnosis(user, id, input);
  }

  @Patch(':id/diagnoses/:diagnosisId')
  @RequirePermissions('patients.clinical.write')
  updateDiagnosis(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('diagnosisId', ParseUUIDPipe) diagnosisId: string,
    @Body() input: UpdatePatientDiagnosisDto,
  ) {
    return this.patientsService.updateDiagnosis(user, id, diagnosisId, input);
  }

  @Post(':id/diagnoses/:diagnosisId/attachments')
  @RequirePermissions('patients.clinical.write')
  @UseInterceptors(
    FilesInterceptor('files', DIAGNOSIS_ATTACHMENT_COUNT_LIMIT, {
      limits: {
        fileSize: DIAGNOSIS_ATTACHMENT_FILE_LIMIT,
        files: DIAGNOSIS_ATTACHMENT_COUNT_LIMIT,
      },
    }),
  )
  addDiagnosisAttachments(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('diagnosisId', ParseUUIDPipe) diagnosisId: string,
    @UploadedFiles() files?: ExamUpload[],
  ) {
    if (!files?.length) {
      throw new BadRequestException('At least one attachment file is required');
    }
    const attachments = files.map((file) => {
      if (file.size === 0) {
        throw new BadRequestException('Attachment files cannot be empty');
      }
      if (file.originalname.length > 255) {
        throw new BadRequestException(
          'Attachment file name must be at most 255 characters',
        );
      }
      const extension = extname(file.originalname).toLowerCase();
      const allowedMimeTypes = EXAM_FILE_TYPES[extension];
      if (!allowedMimeTypes?.includes(file.mimetype)) {
        throw new BadRequestException(
          'Unsupported attachment; upload a DICOM, PNG, JPG, PDF, or STL file',
        );
      }
      return { ...file, originalname: basename(file.originalname) };
    });
    return this.patientsService.addDiagnosisAttachments(
      user,
      id,
      diagnosisId,
      attachments,
    );
  }

  @Get(':id/diagnoses/:diagnosisId/attachments/:attachmentId/file')
  @RequirePermissions('patients.clinical.read')
  async getDiagnosisAttachment(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('diagnosisId', ParseUUIDPipe) diagnosisId: string,
    @Param('attachmentId', ParseUUIDPipe) attachmentId: string,
    @Res() response: Response,
  ) {
    const file = await this.patientsService.getDiagnosisAttachment(
      user,
      id,
      diagnosisId,
      attachmentId,
    );
    response.setHeader('Content-Type', file.mimeType);
    response.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(file.fileName)}`,
    );
    response.setHeader('Content-Length', file.data.byteLength);
    return response.send(file.data);
  }

  @Post(':id/prescriptions')
  @RequirePermissions('patients.clinical.write')
  addPrescription(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: CreatePatientPrescriptionDto,
  ) {
    return this.patientsService.addPrescription(user, id, input);
  }

  @Post(':id/financials')
  @RequirePermissions('patients.financial.write')
  addFinancialEntry(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: CreatePatientFinancialEntryDto,
  ) {
    return this.patientsService.addFinancialEntry(user, id, input);
  }

  @Post(':id/exams')
  @RequirePermissions('patients.clinical.write')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: EXAM_FILE_LIMIT } }),
  )
  addExam(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: CreatePatientExamDto,
    @UploadedFile() file?: ExamUpload,
  ) {
    if (!file || file.size === 0) {
      throw new BadRequestException('A non-empty exam file is required');
    }
    if (file.originalname.length > 255) {
      throw new BadRequestException(
        'Exam file name must be at most 255 characters',
      );
    }
    const extension = extname(file.originalname).toLowerCase();
    const allowedMimeTypes = EXAM_FILE_TYPES[extension];
    if (!allowedMimeTypes?.includes(file.mimetype)) {
      throw new BadRequestException(
        'Unsupported exam file; upload a DICOM, PNG, JPG, PDF, or STL file',
      );
    }
    return this.patientsService.addExam(user, id, {
      ...input,
      doctorName: user.email,
      file: { ...file, originalname: basename(file.originalname) },
    });
  }

  @Get(':id/exams/:examId/file')
  @RequirePermissions('patients.clinical.read')
  async getExamFile(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('examId', ParseUUIDPipe) examId: string,
    @Res() response: Response,
  ) {
    const file = await this.patientsService.getExamFile(user, id, examId);
    response.setHeader('Content-Type', file.mimeType);
    response.setHeader(
      'Content-Disposition',
      `inline; filename*=UTF-8''${encodeURIComponent(file.fileName)}`,
    );
    response.setHeader('Content-Length', file.data.byteLength);
    return response.send(file.data);
  }

  @Post()
  @RequirePermissions('patients.manage')
  create(@CurrentUser() user: AuthUser, @Body() input: CreatePatientDto) {
    return this.patientsService.create(user, input);
  }

  @Patch(':id')
  @RequirePermissions('patients.manage')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdatePatientDto,
  ) {
    return this.patientsService.update(user, id, input);
  }

  @Patch(':id/status')
  @RequirePermissions('patients.manage')
  setStatus(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdatePatientStatusDto,
  ) {
    return this.patientsService.setStatus(user, id, input);
  }

  private sendPdf(response: Response, pdf: Buffer, fileName: string) {
    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
    response.setHeader('Content-Length', pdf.byteLength);
    return response.send(pdf);
  }

  @Delete(':id')
  @RequirePermissions('patients.manage')
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.patientsService.remove(user, id);
  }
}
