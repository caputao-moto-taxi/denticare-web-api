import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser } from '../../../../auth/auth-user';
import { CurrentUser } from '../../../../auth/current-user.decorator';
import { JwtAuthGuard } from '../../../../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../../../auth/permissions.guard';
import { RequirePermissions } from '../../../../auth/permissions';
import { ListQueryDto } from '../../../../shared/infra/http/list-query.dto';
import {
  AppointmentAvailabilityQuery,
  CreateAppointmentDto,
  RescheduleAppointmentDto,
  UpdateAppointmentDto,
} from './dtos/appointment.dto';
import { AppointmentsUseCases } from '../../../application/useCases/appointments.use-cases';

@ApiTags('Appointments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsUseCases) {}

  @Get()
  @RequirePermissions(
    'appointments.read.all',
    'appointments.read.assigned',
  )
  list(@CurrentUser() user: AuthUser, @Query() query: ListQueryDto) {
    return this.appointmentsService.list(user, query);
  }

  @Get('availability')
  @RequirePermissions('appointments.create')
  availability(
    @CurrentUser() user: AuthUser,
    @Query() query: AppointmentAvailabilityQuery,
  ) {
    return this.appointmentsService.availability(user, query);
  }

  @Get(':id')
  @RequirePermissions(
    'appointments.read.all',
    'appointments.read.assigned',
  )
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.appointmentsService.findOne(user, id);
  }

  @Post()
  @RequirePermissions('appointments.create')
  create(@CurrentUser() user: AuthUser, @Body() input: CreateAppointmentDto) {
    return this.appointmentsService.create(user, input);
  }

  @Patch(':id/cancel')
  @RequirePermissions('appointments.manage')
  cancel(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.appointmentsService.cancel(user, id);
  }

  @Patch(':id/complete')
  @RequirePermissions('appointments.manage')
  complete(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.appointmentsService.complete(user, id);
  }

  @Patch(':id/reschedule')
  @RequirePermissions('appointments.manage')
  reschedule(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() input: RescheduleAppointmentDto,
  ) {
    return this.appointmentsService.reschedule(user, id, input);
  }

  @Patch(':id')
  @RequirePermissions('appointments.manage')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() input: UpdateAppointmentDto,
  ) {
    return this.appointmentsService.update(user, id, input);
  }
}
