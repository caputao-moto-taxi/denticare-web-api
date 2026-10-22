import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser } from '../../../../auth/auth-user';
import { CurrentUser } from '../../../../auth/current-user.decorator';
import { JwtAuthGuard } from '../../../../auth/jwt-auth.guard';
import { ManageClinicServicesUseCase } from '../../../application/useCases/clinic-settings.use-cases';
import {
  ClinicServiceDto,
  UpdateClinicServiceDto,
} from './dtos/clinic-settings.dto';

@ApiTags('Clinic services')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('clinic/services')
export class ClinicServicesController {
  constructor(private readonly services: ManageClinicServicesUseCase) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.services.list(user);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() input: ClinicServiceDto) {
    return this.services.create(user, input);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() input: UpdateClinicServiceDto,
  ) {
    return this.services.update(user, id, input);
  }

  @Delete(':id')
  delete(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.services.delete(user, id);
  }
}
