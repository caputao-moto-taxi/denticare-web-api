import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { basename, extname } from 'node:path';
import { Response } from 'express';
import { AuthUser } from '../auth/auth-user';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions';
import { ListQueryDto } from '../shared/infra/http/list-query.dto';
import { CreateXRayAnalysisUseCase } from './application/useCases/create-x-ray-analysis/create-x-ray-analysis-use-case';
import { GetXRayAnalysisFileUseCase } from './application/useCases/get-x-ray-analysis-file/get-x-ray-analysis-file-use-case';
import { ListXRayAnalysesUseCase } from './application/useCases/list-x-ray-analyses/list-x-ray-analyses-use-case';
import { XRayUpload } from './domain/x-ray-analysis.entity';
import { CreateXRayAnalysisDto } from './x-ray-analysis.dto';

const XRAY_FILE_LIMIT = 10 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES: Record<string, 'image/jpeg' | 'image/png'> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
};

@ApiTags('X-ray analyses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('x-ray-analyses')
export class XRayAnalysisController {
  constructor(
    private readonly listAnalyses: ListXRayAnalysesUseCase,
    private readonly createAnalysis: CreateXRayAnalysisUseCase,
    private readonly getAnalysisFile: GetXRayAnalysisFileUseCase,
  ) {}

  @Get()
  @RequirePermissions('patients.clinical.read')
  list(@CurrentUser() user: AuthUser, @Query() query: ListQueryDto) {
    return this.listAnalyses.execute({ user, query });
  }

  @Post()
  @RequirePermissions('patients.clinical.write')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: XRAY_FILE_LIMIT } }),
  )
  create(
    @CurrentUser() user: AuthUser,
    @Body() input: CreateXRayAnalysisDto,
    @UploadedFile() file?: XRayUpload & { mimetype: string },
  ) {
    if (!file || !file.size || !file.buffer?.length) {
      throw new BadRequestException('A non-empty X-ray image is required');
    }
    if (file.originalname.length > 255) {
      throw new BadRequestException(
        'Image file name must be at most 255 characters',
      );
    }
    const extension = extname(file.originalname).toLowerCase();
    const expectedMimeType = ACCEPTED_IMAGE_TYPES[extension];
    if (
      !expectedMimeType ||
      file.mimetype !== expectedMimeType ||
      !hasValidImageSignature(file.buffer, expectedMimeType)
    ) {
      throw new BadRequestException(
        'Unsupported image; upload a valid JPG or PNG file',
      );
    }

    return this.createAnalysis.execute({
      user,
      patientId: input.patientId,
      type: input.type,
      region: input.region,
      file: {
        ...file,
        originalname: basename(file.originalname),
        mimetype: expectedMimeType,
      },
    });
  }

  @Get(':id/file')
  @RequirePermissions('patients.clinical.read')
  async getFile(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() response: Response,
  ) {
    const file = await this.getAnalysisFile.execute({ user, id });
    response.setHeader('Content-Type', file.mimeType);
    response.setHeader(
      'Content-Disposition',
      `inline; filename*=UTF-8''${encodeURIComponent(file.fileName)}`,
    );
    response.setHeader('Content-Length', file.data.byteLength);
    response.setHeader('Cache-Control', 'private, no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    return response.send(file.data);
  }
}

function hasValidImageSignature(
  data: Buffer,
  mimeType: 'image/jpeg' | 'image/png',
) {
  if (mimeType === 'image/png') {
    return data
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  return (
    data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff
  );
}
