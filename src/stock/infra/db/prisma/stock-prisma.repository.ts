import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuthUser } from '../../../../auth/auth-user';
import { Prisma } from '../../../../../generated/prisma/client';
import {
  ListQuery,
  pageWindow,
  paginated,
} from '../../../../shared/domain/list-query';
import {
  dateRange,
  validateListFilters,
} from '../../../../shared/helpers/list-filters';
import { STAFF_ROLES } from '../../../../shared/helpers/staff';
import { PrismaService } from '../../../../shared/infra/db/prisma/prisma.service';
import {
  IStockRepository,
  StockCreateCommand,
  StockRestockCommand,
  StockSaleCreateCommand,
  StockSaleUpdateCommand,
  StockUpdateCommand,
} from '../../../domain/stock.repository';

interface StockRow {
  id: string;
  name: string;
  category: string;
  unit: string;
  quantity: number;
  capacity: number;
  unitCost: number;
  salePrice: number;
  supplier: string;
  notes: string | null;
  lastRestockAt: Date;
}

@Injectable()
export class StockPrismaRepository implements IStockRepository {
  constructor(private readonly prisma: PrismaService) {}

  async summary(user: AuthUser) {
    this.requireStaff(user);
    const items = await this.prisma.stockItem.findMany({
      where: { branchId: user.branchId, deletedAt: null },
      select: { quantity: true, capacity: true, unitCost: true },
    });
    return items.reduce(
      (summary, item) => ({
        productCount: summary.productCount + 1,
        totalUnits: summary.totalUnits + item.quantity,
        lowStockCount:
          summary.lowStockCount +
          (item.quantity <= Math.max(1, Math.ceil(item.capacity * 0.2))
            ? 1
            : 0),
        inventoryCost: summary.inventoryCost + item.quantity * item.unitCost,
      }),
      { productCount: 0, totalUnits: 0, lowStockCount: 0, inventoryCost: 0 },
    );
  }

  async salesSummary(user: AuthUser) {
    this.requireStaff(user);
    const where = { branchId: user.branchId };
    const startDate = new Date();
    startDate.setUTCDate(startDate.getUTCDate() - 6);
    startDate.setUTCHours(0, 0, 0, 0);

    const [totals, recentSales, paymentMethods, topProducts] =
      await Promise.all([
        this.prisma.stockSale.aggregate({
          where,
          _count: { _all: true },
          _sum: { total: true },
          _avg: { total: true },
        }),
        this.prisma.stockSale.findMany({
          where: { ...where, createdAt: { gte: startDate } },
          select: { createdAt: true, total: true },
        }),
        this.prisma.stockSale.groupBy({
          by: ['paymentMethod'],
          where,
          _count: { _all: true },
          _sum: { total: true },
        }),
        this.prisma.stockSaleItem.groupBy({
          by: ['stockItemId', 'itemName'],
          where: { sale: { branchId: user.branchId } },
          _sum: { quantity: true, totalPrice: true },
          orderBy: { _sum: { quantity: 'desc' } },
          take: 5,
        }),
      ]);

    const salesByDay = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(startDate);
      date.setUTCDate(startDate.getUTCDate() + index);
      return {
        date: date.toISOString().slice(0, 10),
        count: 0,
        revenue: 0,
      };
    });
    const salesByDate = new Map(salesByDay.map((day) => [day.date, day]));
    for (const sale of recentSales) {
      const day = salesByDate.get(sale.createdAt.toISOString().slice(0, 10));
      if (day) {
        day.count += 1;
        day.revenue += sale.total;
      }
    }

    return {
      totalSales: totals._count._all,
      totalRevenue: totals._sum.total ?? 0,
      averageTicket: totals._avg.total ?? 0,
      salesByDay,
      paymentMethods: paymentMethods.map((method) => ({
        method: method.paymentMethod,
        count: method._count._all,
        revenue: method._sum.total ?? 0,
      })),
      topProducts: topProducts.map((product) => ({
        stockItemId: product.stockItemId,
        itemName: product.itemName,
        quantity: product._sum.quantity ?? 0,
        revenue: product._sum.totalPrice ?? 0,
      })),
    };
  }

  async list(user: AuthUser, query: ListQuery = {}) {
    this.requireStaff(user);
    validateListFilters(query, { category: true });
    const where: Prisma.StockItemWhereInput = {
      branchId: user.branchId,
      deletedAt: null,
      ...(query.category && { category: query.category }),
      createdAt: dateRange(query),
      ...(query.search && {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { supplier: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.stockItem.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        ...pageWindow(query),
      }),
      this.prisma.stockItem.count({ where }),
    ]);
    return paginated(
      items.map((item) => this.toStockItem(item)),
      total,
      query,
    );
  }

  async findOne(user: AuthUser, id: string) {
    this.requireStaff(user);
    return this.toStockItem(await this.findScoped(user, id));
  }

  async create(user: AuthUser, input: StockCreateCommand) {
    this.requireStaff(user);
    await this.assertCatalogEntry(user, 'category', input.category);
    await this.assertCatalogEntry(user, 'supplier', input.supplier);
    const capacity = input.capacity ?? input.quantity;
    this.assertWithinCapacity(input.quantity, capacity);

    const item = await this.prisma.stockItem.create({
      data: {
        branchId: user.branchId,
        name: input.name.trim(),
        category: input.category,
        unit: input.unit,
        quantity: input.quantity,
        capacity,
        unitCost: input.unitCost,
        salePrice: input.salePrice ?? input.unitCost,
        supplier: input.supplier.trim(),
        notes: input.notes?.trim() || null,
      },
    });
    return this.toStockItem(item);
  }

  async update(user: AuthUser, id: string, input: StockUpdateCommand) {
    this.requireStaff(user);
    if (input.category !== undefined) {
      await this.assertCatalogEntry(user, 'category', input.category);
    }
    if (input.supplier !== undefined) {
      await this.assertCatalogEntry(user, 'supplier', input.supplier);
    }
    const current = await this.findScoped(user, id);
    const quantity = input.quantity ?? current.quantity;
    const capacity = input.capacity ?? current.capacity;
    this.assertWithinCapacity(quantity, capacity);

    const item = await this.prisma.stockItem.update({
      where: { id: current.id },
      data: {
        ...(input.name !== undefined && { name: input.name.trim() }),
        ...(input.category !== undefined && { category: input.category }),
        ...(input.unit !== undefined && { unit: input.unit }),
        quantity,
        capacity,
        ...(input.unitCost !== undefined && { unitCost: input.unitCost }),
        ...(input.salePrice !== undefined && { salePrice: input.salePrice }),
        ...(input.supplier !== undefined && {
          supplier: input.supplier.trim(),
        }),
        ...(input.notes !== undefined && { notes: input.notes.trim() || null }),
      },
    });
    return this.toStockItem(item);
  }

  async restock(user: AuthUser, id: string, input: StockRestockCommand) {
    this.requireStaff(user);

    // Read and write share a transaction so concurrent restocks cannot exceed capacity.
    const item = await this.prisma.$transaction(async (transaction) => {
      const current = await transaction.stockItem.findFirst({
        where: { id, branchId: user.branchId, deletedAt: null },
      });
      if (!current) throw new NotFoundException('Stock item not found');

      const quantity =
        input.amount === undefined
          ? current.capacity
          : current.quantity + input.amount;
      this.assertWithinCapacity(quantity, current.capacity);

      return transaction.stockItem.update({
        where: { id: current.id },
        data: { quantity, lastRestockAt: new Date() },
      });
    });
    return this.toStockItem(item);
  }

  async remove(user: AuthUser, id: string) {
    if (user.role !== 'admin') {
      throw new ForbiddenException(
        'Only clinic administrators can remove stock items',
      );
    }
    const current = await this.findScoped(user, id);
    await this.prisma.stockItem.update({
      where: { id: current.id },
      data: { deletedAt: new Date() },
    });
    return { id: current.id, deleted: true };
  }

  async listSales(user: AuthUser, query: ListQuery = {}) {
    this.requireStaff(user);
    const where: Prisma.StockSaleWhereInput = { branchId: user.branchId };
    const [sales, total] = await this.prisma.$transaction([
      this.prisma.stockSale.findMany({
        where,
        include: {
          items: { orderBy: { itemName: 'asc' } },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        ...pageWindow(query),
      }),
      this.prisma.stockSale.count({ where }),
    ]);
    return paginated(
      sales.map((sale) => this.toStockSale(sale)),
      total,
      query,
    );
  }

  async createSale(user: AuthUser, input: StockSaleCreateCommand) {
    this.requireStaff(user);
    const stockItemIds = input.items.map((line) => line.stockItemId);
    if (new Set(stockItemIds).size !== stockItemIds.length) {
      throw new BadRequestException(
        'A stock item can only appear once in a sale',
      );
    }

    return this.prisma.$transaction(async (transaction) => {
      const currentItems = await transaction.stockItem.findMany({
        where: {
          id: { in: stockItemIds },
          branchId: user.branchId,
          deletedAt: null,
        },
      });
      if (currentItems.length !== stockItemIds.length) {
        throw new NotFoundException('One or more stock items were not found');
      }

      const itemById = new Map(currentItems.map((item) => [item.id, item]));
      let totalCents = 0;
      const saleItems: {
        stockItemId: string;
        itemName: string;
        unit: string;
        quantity: number;
        unitPrice: number;
        totalPrice: number;
      }[] = [];

      for (const line of input.items) {
        const stockItem = itemById.get(line.stockItemId);
        if (!stockItem) {
          throw new NotFoundException('Stock item not found');
        }
        const unitPriceCents = Math.round(stockItem.salePrice * 100);
        const lineTotalCents = unitPriceCents * line.quantity;
        if (
          !Number.isSafeInteger(unitPriceCents) ||
          !Number.isSafeInteger(lineTotalCents) ||
          !Number.isSafeInteger(totalCents + lineTotalCents)
        ) {
          throw new BadRequestException(
            'Sale total exceeds the supported limit',
          );
        }
        totalCents += lineTotalCents;

        const decrement = await transaction.stockItem.updateMany({
          where: {
            id: stockItem.id,
            branchId: user.branchId,
            deletedAt: null,
            quantity: { gte: line.quantity },
          },
          data: { quantity: { decrement: line.quantity } },
        });
        if (decrement.count !== 1) {
          throw new BadRequestException(
            `Insufficient stock for ${stockItem.name}`,
          );
        }

        saleItems.push({
          stockItemId: stockItem.id,
          itemName: stockItem.name,
          unit: stockItem.unit,
          quantity: line.quantity,
          unitPrice: unitPriceCents / 100,
          totalPrice: lineTotalCents / 100,
        });
      }

      const sale = await transaction.stockSale.create({
        data: {
          branchId: user.branchId,
          soldById: user.id,
          customerName: input.customerName?.trim() || null,
          paymentMethod: input.paymentMethod,
          total: totalCents / 100,
          items: { create: saleItems },
        },
        include: { items: true },
      });
      return this.toStockSale(sale);
    });
  }

  async updateSale(user: AuthUser, id: string, input: StockSaleUpdateCommand) {
    this.requireStaff(user);
    const requestedIds = input.items.map((line) => line.stockItemId);
    if (
      input.items.length === 0 ||
      new Set(requestedIds).size !== requestedIds.length
    ) {
      throw new BadRequestException(
        'A sale must contain unique stock items and at least one item',
      );
    }

    return this.prisma.$transaction(async (transaction) => {
      const sale = await transaction.stockSale.findFirst({
        where: { id, branchId: user.branchId },
        include: { items: true },
      });
      if (!sale) throw new NotFoundException('Stock sale not found');

      const currentSaleItems = new Map(
        sale.items.map((saleItem) => [saleItem.stockItemId, saleItem]),
      );
      const targetItems = new Map(
        input.items.map((line) => [line.stockItemId, line]),
      );
      const itemIds = [
        ...new Set([...currentSaleItems.keys(), ...targetItems.keys()]),
      ];
      const stockItems = await transaction.stockItem.findMany({
        where: { id: { in: itemIds }, branchId: user.branchId },
        select: {
          id: true,
          name: true,
          unit: true,
          quantity: true,
          capacity: true,
          salePrice: true,
          deletedAt: true,
        },
      });
      const stockById = new Map(
        stockItems.map((stockItem) => [stockItem.id, stockItem]),
      );
      let totalCents = 0;
      const nextSaleItems = input.items.map((line) => {
        const stockItem = stockById.get(line.stockItemId);
        const existingSaleItem = currentSaleItems.get(line.stockItemId);
        if (!stockItem || (!existingSaleItem && stockItem.deletedAt)) {
          throw new NotFoundException('One or more stock items were not found');
        }

        const unitPrice = existingSaleItem?.unitPrice ?? stockItem.salePrice;
        const unitPriceCents = Math.round(unitPrice * 100);
        const lineTotalCents = unitPriceCents * line.quantity;
        if (
          !Number.isSafeInteger(unitPriceCents) ||
          !Number.isSafeInteger(lineTotalCents) ||
          !Number.isSafeInteger(totalCents + lineTotalCents)
        ) {
          throw new BadRequestException(
            'Sale total exceeds the supported limit',
          );
        }
        totalCents += lineTotalCents;

        return {
          stockItemId: stockItem.id,
          itemName: existingSaleItem?.itemName ?? stockItem.name,
          unit: existingSaleItem?.unit ?? stockItem.unit,
          quantity: line.quantity,
          unitPrice: unitPriceCents / 100,
          totalPrice: lineTotalCents / 100,
        };
      });

      for (const itemId of itemIds) {
        const stockItem = stockById.get(itemId);
        if (!stockItem) throw new NotFoundException('Stock item not found');

        const previousQuantity = currentSaleItems.get(itemId)?.quantity ?? 0;
        const nextQuantity = targetItems.get(itemId)?.quantity ?? 0;
        const quantity = stockItem.quantity + previousQuantity - nextQuantity;
        if (quantity < 0) {
          throw new BadRequestException(
            `Insufficient stock for ${stockItem.name}`,
          );
        }
        if (quantity > stockItem.capacity) {
          throw new BadRequestException(
            `Restored stock exceeds capacity for ${stockItem.name}`,
          );
        }
        if (quantity !== stockItem.quantity) {
          if (stockItem.deletedAt && quantity < stockItem.quantity) {
            throw new BadRequestException(
              `Deleted stock item ${stockItem.name} cannot be added to a sale`,
            );
          }
          const update = await transaction.stockItem.updateMany({
            where: {
              id: itemId,
              branchId: user.branchId,
              quantity: stockItem.quantity,
            },
            data: { quantity },
          });
          if (update.count !== 1) {
            throw new BadRequestException(
              `Stock changed while updating ${stockItem.name}; reload and try again`,
            );
          }
        }
      }

      await transaction.stockSaleItem.deleteMany({ where: { saleId: id } });
      await transaction.stockSaleItem.createMany({
        data: nextSaleItems.map((saleItem) => ({ saleId: id, ...saleItem })),
      });
      const updatedSale = await transaction.stockSale.update({
        where: { id },
        data: { total: totalCents / 100 },
        include: { items: { orderBy: { itemName: 'asc' } } },
      });
      return this.toStockSale(updatedSale);
    });
  }

  async listCatalog(user: AuthUser, kind: 'category' | 'supplier') {
    this.requireStaff(user);
    return this.prisma.stockCatalogEntry.findMany({
      where: { branchId: user.branchId, kind },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      select: { id: true, name: true },
    });
  }

  async createCatalog(
    user: AuthUser,
    kind: 'category' | 'supplier',
    name: string,
  ) {
    this.requireStaff(user);
    const normalizedName = name.trim().replace(/\s+/g, ' ');
    const existing = await this.prisma.stockCatalogEntry.findFirst({
      where: {
        branchId: user.branchId,
        kind,
        name: { equals: normalizedName, mode: 'insensitive' },
      },
      select: { id: true, name: true },
    });
    if (existing) return existing;

    return this.prisma.stockCatalogEntry.create({
      data: { branchId: user.branchId, kind, name: normalizedName },
      select: { id: true, name: true },
    });
  }

  private async findScoped(user: AuthUser, id: string) {
    const item = await this.prisma.stockItem.findFirst({
      where: { id, branchId: user.branchId, deletedAt: null },
    });
    if (!item) throw new NotFoundException('Stock item not found');
    return item;
  }

  private async assertCatalogEntry(
    user: AuthUser,
    kind: 'category' | 'supplier',
    name: string,
  ) {
    const entry = await this.prisma.stockCatalogEntry.findFirst({
      where: {
        branchId: user.branchId,
        kind,
        name: { equals: name.trim(), mode: 'insensitive' },
      },
      select: { id: true },
    });
    if (!entry) {
      throw new BadRequestException(
        `The selected stock ${kind} is not registered for this clinic`,
      );
    }
  }

  private requireStaff(user: AuthUser) {
    if (!STAFF_ROLES.has(user.role)) {
      throw new ForbiddenException('Clinic staff access is required');
    }
  }

  private assertWithinCapacity(quantity: number, capacity: number) {
    if (quantity > capacity) {
      throw new BadRequestException('Quantity cannot exceed the capacity');
    }
  }

  private toStockItem(item: StockRow) {
    return {
      id: item.id,
      name: item.name,
      category: item.category,
      unit: item.unit,
      quantity: item.quantity,
      capacity: item.capacity,
      unitCost: item.unitCost,
      salePrice: item.salePrice,
      supplier: item.supplier,
      lastRestock: item.lastRestockAt.toISOString(),
      notes: item.notes ?? '',
    };
  }

  private toStockSale(sale: {
    id: string;
    customerName: string | null;
    paymentMethod: string;
    total: number;
    createdAt: Date;
    items: {
      stockItemId: string;
      itemName: string;
      unit: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }[];
  }) {
    return {
      id: sale.id,
      customerName: sale.customerName ?? '',
      paymentMethod: sale.paymentMethod,
      total: sale.total,
      createdAt: sale.createdAt.toISOString(),
      items: sale.items.map((item) => ({
        stockItemId: item.stockItemId,
        itemName: item.itemName,
        unit: item.unit,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
      })),
    };
  }
}
