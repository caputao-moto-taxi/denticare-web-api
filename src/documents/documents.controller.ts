import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { AuthUser } from '../auth/auth-user';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions';
import {
  CreatePatientDocumentDto,
  ListDocumentPatientsDto,
  ListPatientDocumentsDto,
} from './documents.dto';
import { DocumentsService } from './documents.service';

@ApiTags('Documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Get('patients')
  @RequirePermissions('documents.manage')
  listPatients(
    @CurrentUser() user: AuthUser,
    @Query() query: ListDocumentPatientsDto,
  ) {
    return this.documents.listPatients(user, query);
  }

  @Get()
  @RequirePermissions('documents.read')
  list(@CurrentUser() user: AuthUser, @Query() query: ListPatientDocumentsDto) {
    return this.documents.list(user, query);
  }

  @Post()
  @RequirePermissions('documents.manage')
  generate(
    @CurrentUser() user: AuthUser,
    @Body() input: CreatePatientDocumentDto,
  ) {
    return this.documents.generate(user, input);
  }

  @Post('preview')
  @RequirePermissions('documents.manage')
  async preview(
    @CurrentUser() user: AuthUser,
    @Body() input: CreatePatientDocumentDto,
    @Res() response: Response,
  ) {
    const file = await this.documents.preview(user, input);
    response
      .set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${file.fileName}"`,
        'Content-Length': file.pdfBytes.length,
        'Cache-Control': 'private, no-store',
      })
      .send(file.pdfBytes);
  }

  @Get(':id/pdf')
  @RequirePermissions('documents.read')
  async getPdf(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('download') download: string,
    @Res() response: Response,
  ) {
    const file = await this.documents.getPdf(user, id);
    const disposition = download === 'true' ? 'attachment' : 'inline';
    response
      .set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${disposition}; filename="${file.fileName}"`,
        'Content-Length': file.pdfBytes.length,
        'Cache-Control': 'private, no-store',
      })
      .send(file.pdfBytes);
  }
}
