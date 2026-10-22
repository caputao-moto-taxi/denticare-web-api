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
import { CreateStockItemUseCase } from '../../../application/useCases/create-stock-item/create-stock-item-use-case';
import { CreateStockSaleUseCase } from '../../../application/useCases/create-stock-sale/create-stock-sale-use-case';
import { ManageStockCatalogUseCase } from '../../../application/useCases/manage-stock-catalog/manage-stock-catalog-use-case';
import { GetStockItemUseCase } from '../../../application/useCases/get-stock-item/get-stock-item-use-case';
import { GetStockSummaryUseCase } from '../../../application/useCases/get-stock-summary/get-stock-summary-use-case';
import { GetStockSalesSummaryUseCase } from '../../../application/useCases/get-stock-sales-summary/get-stock-sales-summary-use-case';
import { ListStockSalesUseCase } from '../../../application/useCases/list-stock-sales/list-stock-sales-use-case';
import { ListStockUseCase } from '../../../application/useCases/list-stock/list-stock-use-case';
import { RemoveStockItemUseCase } from '../../../application/useCases/remove-stock-item/remove-stock-item-use-case';
import { RestockStockItemUseCase } from '../../../application/useCases/restock-stock-item/restock-stock-item-use-case';
import { UpdateStockItemUseCase } from '../../../application/useCases/update-stock-item/update-stock-item-use-case';
import { UpdateStockSaleUseCase } from '../../../application/useCases/update-stock-sale/update-stock-sale-use-case';
import {
  CreateStockItemDto,
  CreateStockSaleDto,
  UpdateStockSaleDto,
  RestockStockItemDto,
  CreateStockCatalogEntryDto,
  UpdateStockItemDto,
} from './dtos/stock.dto';

@ApiTags('Stock')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('stock')
export class StockController {
  constructor(
    private readonly listStock: ListStockUseCase,
    private readonly getStockItem: GetStockItemUseCase,
    private readonly createStockItem: CreateStockItemUseCase,
    private readonly updateStockItem: UpdateStockItemUseCase,
    private readonly restockStockItem: RestockStockItemUseCase,
    private readonly removeStockItem: RemoveStockItemUseCase,
    private readonly listStockSales: ListStockSalesUseCase,
    private readonly createStockSale: CreateStockSaleUseCase,
    private readonly updateStockSale: UpdateStockSaleUseCase,
    private readonly manageStockCatalog: ManageStockCatalogUseCase,
    private readonly getStockSummary: GetStockSummaryUseCase,
    private readonly getStockSalesSummary: GetStockSalesSummaryUseCase,
  ) {}

  @Get('summary')
  @RequirePermissions('stock.read')
  summary(@CurrentUser() user: AuthUser) {
    return this.getStockSummary.execute(user);
  }

  @Get('categories')
  @RequirePermissions('stock.read')
  listCategories(@CurrentUser() user: AuthUser) {
    return this.manageStockCatalog.list(user, 'category');
  }

  @Post('categories')
  @RequirePermissions('stock.manage')
  createCategory(
    @CurrentUser() user: AuthUser,
    @Body() input: CreateStockCatalogEntryDto,
  ) {
    return this.manageStockCatalog.create(user, 'category', input.name);
  }

  @Get('suppliers')
  @RequirePermissions('stock.read')
  listSuppliers(@CurrentUser() user: AuthUser) {
    return this.manageStockCatalog.list(user, 'supplier');
  }

  @Post('suppliers')
  @RequirePermissions('stock.manage')
  createSupplier(
    @CurrentUser() user: AuthUser,
    @Body() input: CreateStockCatalogEntryDto,
  ) {
    return this.manageStockCatalog.create(user, 'supplier', input.name);
  }

  @Get('sales')
  @RequirePermissions('stock.read')
  listSales(@CurrentUser() user: AuthUser, @Query() query: ListQueryDto) {
    return this.listStockSales.execute({ user, query });
  }

  @Get('sales/summary')
  @RequirePermissions('stock.read')
  salesSummary(@CurrentUser() user: AuthUser) {
    return this.getStockSalesSummary.execute(user);
  }

  @Post('sales')
  @RequirePermissions('stock.sell', 'stock.manage')
  createSale(@CurrentUser() user: AuthUser, @Body() input: CreateStockSaleDto) {
    return this.createStockSale.execute({ user, input });
  }

  @Patch('sales/:id')
  @RequirePermissions('stock.sell', 'stock.manage')
  updateSale(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() input: UpdateStockSaleDto,
  ) {
    return this.updateStockSale.execute({ user, id, input });
  }

  @Get()
  @RequirePermissions('stock.read')
  list(@CurrentUser() user: AuthUser, @Query() query: ListQueryDto) {
    return this.listStock.execute({ user, query });
  }

  @Get(':id')
  @RequirePermissions('stock.read')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.getStockItem.execute({ user, id });
  }

  @Post()
  @RequirePermissions('stock.manage')
  create(@CurrentUser() user: AuthUser, @Body() input: CreateStockItemDto) {
    return this.createStockItem.execute({ user, input });
  }

  @Patch(':id')
  @RequirePermissions('stock.manage')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() input: UpdateStockItemDto,
  ) {
    return this.updateStockItem.execute({ user, id, input });
  }

  @Patch(':id/restock')
  @RequirePermissions('stock.manage')
  restock(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() input: RestockStockItemDto,
  ) {
    return this.restockStockItem.execute({ user, id, input });
  }

  @Delete(':id')
  @RequirePermissions('stock.manage')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.removeStockItem.execute({ user, id });
  }
}
