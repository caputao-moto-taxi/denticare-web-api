import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { AuthUser } from '../../../../auth/auth-user';
import { CurrentUser } from '../../../../auth/current-user.decorator';
import { JwtAuthGuard } from '../../../../auth/jwt-auth.guard';
import {
  GetClinicSettingsUseCase,
  ManageClinicLogoUseCase,
  UpdateClinicSettingsUseCase,
} from '../../../application/useCases/clinic-settings.use-cases';
import { UpdateClinicSettingsDto } from './dtos/clinic-settings.dto';

type LogoUpload = { mimetype: string; size: number; buffer: Buffer };

@ApiTags('Clinic settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('clinic/settings')
export class ClinicSettingsController {
  constructor(
    private readonly getSettings: GetClinicSettingsUseCase,
    private readonly updateSettings: UpdateClinicSettingsUseCase,
    private readonly manageLogo: ManageClinicLogoUseCase,
  ) {}

  @Get()
  get(@CurrentUser() user: AuthUser) {
    return this.getSettings.execute(user);
  }

  @Patch()
  update(
    @CurrentUser() user: AuthUser,
    @Body() input: UpdateClinicSettingsDto,
  ) {
    return this.updateSettings.execute(user, input);
  }

  @Post('logo')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }),
  )
  uploadLogo(@CurrentUser() user: AuthUser, @UploadedFile() file?: LogoUpload) {
    if (
      !file?.size ||
      !['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)
    ) {
      throw new BadRequestException(
        'A non-empty JPEG, PNG, or WebP logo is required',
      );
    }
    return this.manageLogo.upload(user, file);
  }

  @Get('logo')
  async getLogo(@CurrentUser() user: AuthUser, @Res() response: Response) {
    const file = await this.manageLogo.getForUser(user);
    response.setHeader(
      'Content-Type',
      file.mime_type ?? 'application/octet-stream',
    );
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Content-Disposition', 'inline');
    response.setHeader('Content-Length', file.data.byteLength);
    return response.send(file.data);
  }
}
