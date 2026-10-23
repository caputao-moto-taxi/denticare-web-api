import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { AuthUser } from '../../../../auth/auth-user';
import { CurrentUser } from '../../../../auth/current-user.decorator';
import { JwtAuthGuard } from '../../../../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../../../auth/permissions.guard';
import { RequirePermissions } from '../../../../auth/permissions';
import { HttpResponse } from '../../../../shared/contracts/httpContracts';
import { ListQueryDto } from '../../../../shared/infra/http/list-query.dto';
import {
  CancelAppointmentUseCase,
  CompleteAppointmentUseCase,
  CreateAppointmentUseCase,
  GetAppointmentAvailabilityUseCase,
  GetAppointmentUseCase,
  ListAppointmentsUseCase,
  RescheduleAppointmentUseCase,
  UpdateAppointmentUseCase,
} from '../../../application/useCases';
import {
  AppointmentAvailabilityQuery,
  CreateAppointmentDto,
  RescheduleAppointmentDto,
  UpdateAppointmentDto,
} from './dtos/appointment.dto';

const send = (res: Response, result: HttpResponse) =>
  res.status(result.status).json(result.data);

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
  async list(
    @CurrentUser() user: AuthUser,
    @Query() query: ListQueryDto,
    @Res() res: Response,
  ) {
    return send(res, await this.listAppointments.execute({ user, query }));
  }

  @Get('availability')
  @RequirePermissions('appointments.create')
  async availability(
    @CurrentUser() user: AuthUser,
    @Query() query: AppointmentAvailabilityQuery,
    @Res() res: Response,
  ) {
    return send(res, await this.getAvailability.execute({ user, query }));
  }

  @Get(':id')
  @RequirePermissions('appointments.read.all', 'appointments.read.assigned')
  async findOne(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    return send(res, await this.getAppointment.execute({ user, id }));
  }

  @Post()
  @RequirePermissions('appointments.create')
  async create(
    @CurrentUser() user: AuthUser,
    @Body() input: CreateAppointmentDto,
    @Res() res: Response,
  ) {
    return send(res, await this.createAppointment.execute({ user, input }));
  }

  @Patch(':id/cancel')
  @RequirePermissions('appointments.manage')
  async cancel(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    return send(res, await this.cancelAppointment.execute({ user, id }));
  }

  @Patch(':id/complete')
  @RequirePermissions('appointments.manage')
  async complete(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    return send(res, await this.completeAppointment.execute({ user, id }));
  }

  @Patch(':id/reschedule')
  @RequirePermissions('appointments.manage')
  async reschedule(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() input: RescheduleAppointmentDto,
    @Res() res: Response,
  ) {
    return send(
      res,
      await this.rescheduleAppointment.execute({ user, id, input }),
    );
  }

  @Patch(':id')
  @RequirePermissions('appointments.manage')
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() input: UpdateAppointmentDto,
    @Res() res: Response,
  ) {
    return send(res, await this.updateAppointment.execute({ user, id, input }));
  }
}
