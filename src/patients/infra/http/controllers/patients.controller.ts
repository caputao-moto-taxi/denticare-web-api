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
  CreatePatientDiagnosisDto,
  CreatePatientExamDto,
  CreatePatientFinancialEntryDto,
  CreatePatientPrescriptionDto,
  UpdatePatientDiagnosisDto,
  UpdatePatientDto,
  UpdatePatientStatusDto,
  UpdatePatientToothDto,
} from './dtos';
import {
  AddPatientDiagnosisAttachmentsUseCase,
  ManagePatientAvatarUseCase,
  AddPatientDiagnosisUseCase,
  AddPatientExamUseCase,
  AddPatientFinancialEntryUseCase,
  AddPatientPrescriptionUseCase,
  CreatePatientUseCase,
  DeletePatientUseCase,
  GetPatientChartPdfUseCase,
  GetPatientDetailsUseCase,
  GetPatientDiagnosisAttachmentUseCase,
  GetPatientExamFileUseCase,
  GetPatientFinancialPdfUseCase,
  GetPatientPrescriptionPdfUseCase,
  GetPatientUseCase,
  ListPatientsUseCase,
  SetPatientStatusUseCase,
  UpdatePatientDiagnosisUseCase,
  UpdatePatientToothUseCase,
  UpdatePatientUseCase,
} from '../../../application/useCases';

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
    private readonly listPatientsUseCase: ListPatientsUseCase,
    private readonly getPatientUseCase: GetPatientUseCase,
    private readonly getPatientDetailsUseCase: GetPatientDetailsUseCase,
    private readonly getPatientChartPdfUseCase: GetPatientChartPdfUseCase,
    private readonly getPatientPrescriptionPdfUseCase: GetPatientPrescriptionPdfUseCase,
    private readonly getPatientFinancialPdfUseCase: GetPatientFinancialPdfUseCase,
    private readonly updatePatientToothUseCase: UpdatePatientToothUseCase,
    private readonly addPatientDiagnosisUseCase: AddPatientDiagnosisUseCase,
    private readonly updatePatientDiagnosisUseCase: UpdatePatientDiagnosisUseCase,
    private readonly addPatientDiagnosisAttachmentsUseCase: AddPatientDiagnosisAttachmentsUseCase,
    private readonly getPatientDiagnosisAttachmentUseCase: GetPatientDiagnosisAttachmentUseCase,
    private readonly addPatientPrescriptionUseCase: AddPatientPrescriptionUseCase,
    private readonly addPatientFinancialEntryUseCase: AddPatientFinancialEntryUseCase,
    private readonly addPatientExamUseCase: AddPatientExamUseCase,
    private readonly getPatientExamFileUseCase: GetPatientExamFileUseCase,
    private readonly createPatientUseCase: CreatePatientUseCase,
    private readonly updatePatientUseCase: UpdatePatientUseCase,
    private readonly setPatientStatusUseCase: SetPatientStatusUseCase,
    private readonly deletePatientUseCase: DeletePatientUseCase,
    private readonly managePatientAvatar: ManagePatientAvatarUseCase,
  ) {}

  @Get()
  @RequirePermissions('patients.read')
  list(@CurrentUser() user: AuthUser, @Query() query: ListQueryDto) {
    return this.listPatientsUseCase.execute({ user, query });
  }

  @Get(':id')
  @RequirePermissions('patients.read')
  findOne(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.getPatientUseCase.execute({ user, id });
  }

  @Get(':id/details')
  @RequirePermissions('patients.read')
  details(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.getPatientDetailsUseCase.execute({ user, id });
  }

  @Get(':id/avatar')
  @RequirePermissions('patients.read')
  async getAvatar(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() response: Response,
  ) {
    const file = await this.managePatientAvatar.get(user, id);
    response.setHeader('Content-Type', file.mimeType);
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Content-Disposition', 'inline');
    response.setHeader('Content-Length', file.data.byteLength);
    return response.send(file.data);
  }

  @Post(':id/avatar')
  @RequirePermissions('patients.manage')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }),
  )
  uploadAvatar(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file?: ExamUpload,
  ) {
    if (
      !file?.size ||
      !['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)
    ) {
      throw new BadRequestException(
        'A non-empty JPEG, PNG, or WebP avatar is required',
      );
    }
    return this.managePatientAvatar.upload(user, id, file);
  }

  @Get(':id/chart/pdf')
  @RequirePermissions('patients.read')
  async getPatientChartPdf(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() response: Response,
  ) {
    const pdf = await this.getPatientChartPdfUseCase.execute({ user, id });
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
    const pdf = await this.getPatientPrescriptionPdfUseCase.execute({
      user,
      id,
      prescriptionId,
    });
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
    const pdf = await this.getPatientFinancialPdfUseCase.execute({
      user,
      id,
      financialId,
    });
    return this.sendPdf(response, pdf, `financial-${financialId}.pdf`);
  }

  @Patch(':id/odontogram')
  @RequirePermissions('patients.clinical.write')
  updateTooth(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdatePatientToothDto,
  ) {
    return this.updatePatientToothUseCase.execute({
      user,
      id,
      tooth: input,
    });
  }

  @Post(':id/diagnoses')
  @RequirePermissions('patients.clinical.write')
  addDiagnosis(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: CreatePatientDiagnosisDto,
  ) {
    return this.addPatientDiagnosisUseCase.execute({
      user,
      id,
      diagnosis: input,
    });
  }

  @Patch(':id/diagnoses/:diagnosisId')
  @RequirePermissions('patients.clinical.write')
  updateDiagnosis(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('diagnosisId', ParseUUIDPipe) diagnosisId: string,
    @Body() input: UpdatePatientDiagnosisDto,
  ) {
    return this.updatePatientDiagnosisUseCase.execute({
      user,
      id,
      diagnosisId,
      diagnosis: input,
    });
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
    return this.addPatientDiagnosisAttachmentsUseCase.execute({
      user,
      id,
      diagnosisId,
      files: attachments,
    });
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
    const file = await this.getPatientDiagnosisAttachmentUseCase.execute({
      user,
      id,
      diagnosisId,
      attachmentId,
    });
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
    return this.addPatientPrescriptionUseCase.execute({
      user,
      id,
      prescription: input,
    });
  }

  @Post(':id/financials')
  @RequirePermissions('patients.financial.write')
  addFinancialEntry(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: CreatePatientFinancialEntryDto,
  ) {
    return this.addPatientFinancialEntryUseCase.execute({
      user,
      id,
      financialEntry: input,
    });
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
    return this.addPatientExamUseCase.execute({
      user,
      id,
      exam: {
        ...input,
        doctorName: user.email,
        file: { ...file, originalname: basename(file.originalname) },
      },
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
    const file = await this.getPatientExamFileUseCase.execute({
      user,
      id,
      examId,
    });
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
    return this.createPatientUseCase.execute({ user, patient: input });
  }

  @Patch(':id')
  @RequirePermissions('patients.manage')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdatePatientDto,
  ) {
    return this.updatePatientUseCase.execute({ user, id, changes: input });
  }

  @Patch(':id/status')
  @RequirePermissions('patients.manage')
  setStatus(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdatePatientStatusDto,
  ) {
    return this.setPatientStatusUseCase.execute({ user, id, status: input });
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
    return this.deletePatientUseCase.execute({ user, id });
  }
}
