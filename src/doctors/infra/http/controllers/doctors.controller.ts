import {
  Body,
  Controller,
  Delete,
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
import { DoctorsUseCases } from '../../../application/useCases/doctors.use-cases';
import { CreateDoctorDto, UpdateDoctorDto } from './dtos/doctor.dto';

@ApiTags('Doctors')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('doctors')
export class DoctorsController {
  constructor(private readonly doctorsService: DoctorsUseCases) {}

  @Get()
  @RequirePermissions('doctors.read')
  list(@CurrentUser() user: AuthUser, @Query() query: ListQueryDto) {
    return this.doctorsService.list(user, query);
  }

  @Get(':id')
  @RequirePermissions('doctors.read')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.doctorsService.findOne(user, id);
  }

  @Post()
  @RequirePermissions('doctors.manage')
  create(@CurrentUser() user: AuthUser, @Body() input: CreateDoctorDto) {
    return this.doctorsService.create(user, input);
  }

  @Patch(':id')
  @RequirePermissions('doctors.manage')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() input: UpdateDoctorDto,
  ) {
    return this.doctorsService.update(user, id, input);
  }

  @Delete(':id')
  @RequirePermissions('doctors.manage')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.doctorsService.remove(user, id);
  }
}
