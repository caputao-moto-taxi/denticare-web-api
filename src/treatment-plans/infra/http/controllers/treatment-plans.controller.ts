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
import { TreatmentPlansUseCases } from '../../../application/useCases/treatment-plans.use-cases';
import {
  CreateTreatmentPlanDto,
  UpdateTreatmentPlanDto,
  UpdateTreatmentPlanProgressDto,
} from './dtos/treatment-plan.dto';

@ApiTags('Treatment plans')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('treatment-plans')
export class TreatmentPlansController {
  constructor(private readonly plansService: TreatmentPlansUseCases) {}

  @Get()
  @RequirePermissions('patients.clinical.read')
  list(@CurrentUser() user: AuthUser, @Query() query: ListQueryDto) {
    return this.plansService.list(user, query);
  }

  @Get(':id')
  @RequirePermissions('patients.clinical.read')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.plansService.findOne(user, id);
  }

  @Post()
  @RequirePermissions('patients.clinical.write')
  create(@CurrentUser() user: AuthUser, @Body() input: CreateTreatmentPlanDto) {
    return this.plansService.create(user, input);
  }

  @Patch(':id')
  @RequirePermissions('patients.clinical.write')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() input: UpdateTreatmentPlanDto,
  ) {
    return this.plansService.update(user, id, input);
  }

  @Patch(':id/progress')
  @RequirePermissions('patients.clinical.write')
  setProgress(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() input: UpdateTreatmentPlanProgressDto,
  ) {
    return this.plansService.setProgress(user, id, input);
  }

  @Delete(':id')
  @RequirePermissions('patients.clinical.write')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.plansService.remove(user, id);
  }
}
