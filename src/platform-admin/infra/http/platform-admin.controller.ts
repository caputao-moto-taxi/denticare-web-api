import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser } from '../../../auth/auth-user';
import { CurrentUser } from '../../../auth/current-user.decorator';
import { JwtAuthGuard } from '../../../auth/jwt-auth.guard';
import { PlatformOwnerGuard } from '../../../subscriptions/infra/http/platform-owner.guard';
import { PlatformAdminService } from '../../application/platform-admin.service';
import {
  PlatformClinicFilterDto,
  SetPlatformEntityStatusDto,
  UpdatePlatformClinicDto,
} from './platform-admin.dto';

@ApiTags('Platform administration')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PlatformOwnerGuard)
@Controller('admin/platform')
export class PlatformAdminController {
  constructor(private readonly platformAdmin: PlatformAdminService) {}

  @Get('overview')
  overview() {
    return this.platformAdmin.overview();
  }

  @Get('clinics')
  clinics(@Query() filter: PlatformClinicFilterDto) {
    return this.platformAdmin.listClinics(filter);
  }

  @Get('clinics/:clinicId')
  clinicDetails(@Param('clinicId', ParseUUIDPipe) clinicId: string) {
    return this.platformAdmin.clinicDetails(clinicId);
  }

  @Patch('clinics/:clinicId')
  updateClinic(
    @Param('clinicId', ParseUUIDPipe) clinicId: string,
    @CurrentUser() actor: AuthUser,
    @Body() input: UpdatePlatformClinicDto,
  ) {
    return this.platformAdmin.updateClinic(clinicId, actor, input);
  }

  @Patch('clinics/:clinicId/status')
  setClinicStatus(
    @Param('clinicId', ParseUUIDPipe) clinicId: string,
    @CurrentUser() actor: AuthUser,
    @Body() input: SetPlatformEntityStatusDto,
  ) {
    return this.platformAdmin.setClinicStatus(clinicId, actor, input.isActive);
  }

  @Patch('clinics/:clinicId/users/:userId/status')
  setUserStatus(
    @Param('clinicId', ParseUUIDPipe) clinicId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() actor: AuthUser,
    @Body() input: SetPlatformEntityStatusDto,
  ) {
    return this.platformAdmin.setUserStatus(
      clinicId,
      userId,
      actor,
      input.isActive,
    );
  }
}
