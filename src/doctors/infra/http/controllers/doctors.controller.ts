import {
  Body,
  BadRequestException,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser } from '../../../../auth/auth-user';
import { CurrentUser } from '../../../../auth/current-user.decorator';
import { JwtAuthGuard } from '../../../../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../../../auth/permissions.guard';
import { RequirePermissions } from '../../../../auth/permissions';
import { ListQueryDto } from '../../../../shared/infra/http/list-query.dto';
import {
  CreateDoctorUseCase,
  DeleteDoctorUseCase,
  GetDoctorUseCase,
  ListDoctorsUseCase,
  UpdateDoctorUseCase,
  ManageDoctorAvatarUseCase,
} from '../../../application/useCases';
import { CreateDoctorDto, UpdateDoctorDto } from './dtos';

type AvatarUpload = { mimetype: string; size: number; buffer: Buffer };

@ApiTags('Doctors')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('doctors')
export class DoctorsController {
  constructor(
    private readonly listDoctorsUseCase: ListDoctorsUseCase,
    private readonly getDoctorUseCase: GetDoctorUseCase,
    private readonly createDoctorUseCase: CreateDoctorUseCase,
    private readonly updateDoctorUseCase: UpdateDoctorUseCase,
    private readonly deleteDoctorUseCase: DeleteDoctorUseCase,
    private readonly manageDoctorAvatar: ManageDoctorAvatarUseCase,
  ) {}

  @Get()
  @RequirePermissions('doctors.read')
  list(@CurrentUser() user: AuthUser, @Query() query: ListQueryDto) {
    return this.listDoctorsUseCase.execute({ user, query });
  }

  @Get(':id')
  @RequirePermissions('doctors.read')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.getDoctorUseCase.execute({ user, id });
  }

  @Get(':id/avatar')
  @RequirePermissions('doctors.read')
  async getAvatar(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Res() response: Response,
  ) {
    const file = await this.manageDoctorAvatar.get(user, id);
    response.setHeader('Content-Type', file.mimeType);
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Content-Disposition', 'inline');
    response.setHeader('Content-Length', file.data.byteLength);
    return response.send(file.data);
  }

  @Post(':id/avatar')
  @RequirePermissions('doctors.manage')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }),
  )
  uploadAvatar(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @UploadedFile() file?: AvatarUpload,
  ) {
    if (
      !file?.size ||
      !['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)
    ) {
      throw new BadRequestException(
        'A non-empty JPEG, PNG, or WebP avatar is required',
      );
    }
    return this.manageDoctorAvatar.upload(user, id, file);
  }

  @Post()
  @RequirePermissions('doctors.manage')
  create(@CurrentUser() user: AuthUser, @Body() input: CreateDoctorDto) {
    return this.createDoctorUseCase.execute({ user, doctor: input });
  }

  @Patch(':id')
  @RequirePermissions('doctors.manage')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() input: UpdateDoctorDto,
  ) {
    return this.updateDoctorUseCase.execute({ user, id, changes: input });
  }

  @Delete(':id')
  @RequirePermissions('doctors.manage')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.deleteDoctorUseCase.execute({ user, id });
  }
}
