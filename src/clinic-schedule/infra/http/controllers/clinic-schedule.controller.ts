import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser } from '../../../../auth/auth-user';
import { CurrentUser } from '../../../../auth/current-user.decorator';
import { JwtAuthGuard } from '../../../../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../../../auth/permissions.guard';
import { RequirePermissions } from '../../../../auth/permissions';
import { ClinicScheduleUseCases } from '../../../application/useCases/clinic-schedule.use-cases';
import { UpdateClinicScheduleDto } from './dtos/clinic-schedule.dto';

@ApiTags('Clinic schedule')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('clinic/schedule')
export class ClinicScheduleController {
  constructor(private readonly scheduleService: ClinicScheduleUseCases) {}

  @Get()
  @RequirePermissions(
    'appointments.read.all',
    'appointments.read.assigned',
    'appointments.create',
  )
  get(@CurrentUser() user: AuthUser) {
    return this.scheduleService.get(user);
  }

  @Put()
  @RequirePermissions('appointments.manage')
  update(
    @CurrentUser() user: AuthUser,
    @Body() input: UpdateClinicScheduleDto,
  ) {
    return this.scheduleService.update(user, input);
  }
}
