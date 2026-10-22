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
import { CreateTreatmentPlanUseCase } from '../../../application/useCases/create-treatment-plan/create-treatment-plan-use-case';
import { DeleteTreatmentPlanUseCase } from '../../../application/useCases/delete-treatment-plan/delete-treatment-plan-use-case';
import { GetTreatmentPlanUseCase } from '../../../application/useCases/get-treatment-plan/get-treatment-plan-use-case';
import { ListTreatmentPlansUseCase } from '../../../application/useCases/list-treatment-plans/list-treatment-plans-use-case';
import { SetTreatmentPlanProgressUseCase } from '../../../application/useCases/set-treatment-plan-progress/set-treatment-plan-progress-use-case';
import { UpdateTreatmentPlanUseCase } from '../../../application/useCases/update-treatment-plan/update-treatment-plan-use-case';
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
  constructor(
    private readonly listPlans: ListTreatmentPlansUseCase,
    private readonly getPlan: GetTreatmentPlanUseCase,
    private readonly createPlan: CreateTreatmentPlanUseCase,
    private readonly updatePlan: UpdateTreatmentPlanUseCase,
    private readonly setPlanProgress: SetTreatmentPlanProgressUseCase,
    private readonly deletePlan: DeleteTreatmentPlanUseCase,
  ) {}

  @Get()
  @RequirePermissions('patients.clinical.read')
  list(@CurrentUser() user: AuthUser, @Query() query: ListQueryDto) {
    return this.listPlans.execute({ user, query });
  }

  @Get(':id')
  @RequirePermissions('patients.clinical.read')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.getPlan.execute({ user, id });
  }

  @Post()
  @RequirePermissions('patients.clinical.write')
  create(@CurrentUser() user: AuthUser, @Body() input: CreateTreatmentPlanDto) {
    return this.createPlan.execute({ user, input });
  }

  @Patch(':id')
  @RequirePermissions('patients.clinical.write')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() input: UpdateTreatmentPlanDto,
  ) {
    return this.updatePlan.execute({ user, id, input });
  }

  @Patch(':id/progress')
  @RequirePermissions('patients.clinical.write')
  setProgress(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() input: UpdateTreatmentPlanProgressDto,
  ) {
    return this.setPlanProgress.execute({ user, id, input });
  }

  @Delete(':id')
  @RequirePermissions('patients.clinical.write')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.deletePlan.execute({ user, id });
  }
}
