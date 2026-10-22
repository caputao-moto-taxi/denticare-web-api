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
import { CancelAppointmentUseCase } from '../../../application/useCases/cancel-appointment/cancel-appointment-use-case';
import { CompleteAppointmentUseCase } from '../../../application/useCases/complete-appointment/complete-appointment-use-case';
import { CreateAppointmentUseCase } from '../../../application/useCases/create-appointment/create-appointment-use-case';
import { GetAppointmentAvailabilityUseCase } from '../../../application/useCases/get-appointment-availability/get-appointment-availability-use-case';
import { GetAppointmentUseCase } from '../../../application/useCases/get-appointment/get-appointment-use-case';
import { ListAppointmentsUseCase } from '../../../application/useCases/list-appointments/list-appointments-use-case';
import { RescheduleAppointmentUseCase } from '../../../application/useCases/reschedule-appointment/reschedule-appointment-use-case';
import { UpdateAppointmentUseCase } from '../../../application/useCases/update-appointment/update-appointment-use-case';
import {
  AppointmentAvailabilityQuery,
  CreateAppointmentDto,
  RescheduleAppointmentDto,
  UpdateAppointmentDto,
} from './dtos/appointment.dto';

@ApiTags('Appointments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('appointments')
export class AppointmentsController {
  constructor(
    private readonly listAppointments: ListAppointmentsUseCase,
    private readonly getAppointment: GetAppointmentUseCase,
    private readonly createAppointment: CreateAppointmentUseCase,
    private readonly cancelAppointment: CancelAppointmentUseCase,
    private readonly completeAppointment: CompleteAppointmentUseCase,
    private readonly rescheduleAppointment: RescheduleAppointmentUseCase,
    private readonly updateAppointment: UpdateAppointmentUseCase,
    private readonly getAvailability: GetAppointmentAvailabilityUseCase,
  ) {}

  @Get()
  @RequirePermissions('appointments.read.all', 'appointments.read.assigned')
  list(@CurrentUser() user: AuthUser, @Query() query: ListQueryDto) {
    return this.listAppointments.execute({ user, query });
  }

  @Get('availability')
  @RequirePermissions('appointments.create')
  availability(
    @CurrentUser() user: AuthUser,
    @Query() query: AppointmentAvailabilityQuery,
  ) {
    return this.getAvailability.execute({ user, query });
  }

  @Get(':id')
  @RequirePermissions('appointments.read.all', 'appointments.read.assigned')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.getAppointment.execute({ user, id });
  }

  @Post()
  @RequirePermissions('appointments.create')
  create(@CurrentUser() user: AuthUser, @Body() input: CreateAppointmentDto) {
    return this.createAppointment.execute({ user, input });
  }

  @Patch(':id/cancel')
  @RequirePermissions('appointments.manage')
  cancel(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.cancelAppointment.execute({ user, id });
  }

  @Patch(':id/complete')
  @RequirePermissions('appointments.manage')
  complete(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.completeAppointment.execute({ user, id });
  }

  @Patch(':id/reschedule')
  @RequirePermissions('appointments.manage')
  reschedule(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() input: RescheduleAppointmentDto,
  ) {
    return this.rescheduleAppointment.execute({ user, id, input });
  }

  @Patch(':id')
  @RequirePermissions('appointments.manage')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() input: UpdateAppointmentDto,
  ) {
    return this.updateAppointment.execute({ user, id, input });
  }
}
