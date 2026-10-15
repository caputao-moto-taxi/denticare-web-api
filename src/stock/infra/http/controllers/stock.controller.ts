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
import { StockUseCases } from '../../../application/useCases/stock.use-cases';
import {
  CreateStockItemDto,
  CreateStockSaleDto,
  RestockStockItemDto,
  UpdateStockItemDto,
} from './dtos/stock.dto';

@ApiTags('Stock')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('stock')
export class StockController {
  constructor(private readonly stockService: StockUseCases) {}

  @Get('sales')
  @RequirePermissions('stock.read')
  listSales(@CurrentUser() user: AuthUser, @Query() query: ListQueryDto) {
    return this.stockService.listSales(user, query);
  }

  @Post('sales')
  @RequirePermissions('stock.sell', 'stock.manage')
  createSale(@CurrentUser() user: AuthUser, @Body() input: CreateStockSaleDto) {
    return this.stockService.createSale(user, input);
  }

  @Get()
  @RequirePermissions('stock.read')
  list(@CurrentUser() user: AuthUser, @Query() query: ListQueryDto) {
    return this.stockService.list(user, query);
  }

  @Get(':id')
  @RequirePermissions('stock.read')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.stockService.findOne(user, id);
  }

  @Post()
  @RequirePermissions('stock.manage')
  create(@CurrentUser() user: AuthUser, @Body() input: CreateStockItemDto) {
    return this.stockService.create(user, input);
  }

  @Patch(':id')
  @RequirePermissions('stock.manage')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() input: UpdateStockItemDto,
  ) {
    return this.stockService.update(user, id, input);
  }

  @Patch(':id/restock')
  @RequirePermissions('stock.manage')
  restock(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() input: RestockStockItemDto,
  ) {
    return this.stockService.restock(user, id, input);
  }

  @Delete(':id')
  @RequirePermissions('stock.manage')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.stockService.remove(user, id);
  }
}
