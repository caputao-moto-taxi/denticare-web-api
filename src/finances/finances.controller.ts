import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser } from '../auth/auth-user';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionSlug, RequirePermissions } from '../auth/permissions';
import { PermissionsGuard } from '../auth/permissions.guard';
import { FinancesService } from './finances.service';
import { FinanceQueryDto } from './finance-query.dto';

const FINANCES_READ = 'finances.read' as PermissionSlug;

@ApiTags('Finances')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('finances')
export class FinancesController {
  constructor(private readonly financesService: FinancesService) {}

  @Get('summary')
  @RequirePermissions(FINANCES_READ)
  summary(@CurrentUser() user: AuthUser, @Query() query: FinanceQueryDto) {
    return this.financesService.summary(user, query);
  }

  @Get('movements')
  @RequirePermissions(FINANCES_READ)
  movements(@CurrentUser() user: AuthUser, @Query() query: FinanceQueryDto) {
    return this.financesService.movements(user, query);
  }
}
