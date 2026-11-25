import {
  BadRequestException,
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
import { PrismaService } from '../../../../shared/infra/db/prisma/prisma.service';
import {
  IStockRepository,
  StockCreateCommand,
  StockUpdateCommand,
  IStockTransactionRepository,
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

function stockCreatedAtRange(query: ListQuery) {
  return {
    ...(query.dateFrom && {
      gte: new Date(`${query.dateFrom}T00:00:00.000Z`),
    }),
    ...(query.dateTo && {
      lt: new Date(
        new Date(`${query.dateTo}T00:00:00.000Z`).getTime() + 86400000,
      ),
    }),
  };
}

@Injectable()
export class StockPrismaRepository implements IStockRepository {
  constructor(private readonly prisma: PrismaService) {}

  async summary(user: AuthUser) {
    return this.prisma.stockItem.findMany({
      where: { branchId: user.branchId, deletedAt: null },
      select: { quantity: true, capacity: true, unitCost: true },
    });
  }

  async salesSummary(user: AuthUser, startDate: Date) {
    const where = { branchId: user.branchId };

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

    return { totals, recentSales, paymentMethods, topProducts };
  }

  async list(user: AuthUser, query: ListQuery = {}) {
    const where: Prisma.StockItemWhereInput = {
      branchId: user.branchId,
      deletedAt: null,
      ...(query.category && { category: query.category }),
      createdAt: stockCreatedAtRange(query),
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
    return this.toStockItem(await this.findScoped(user, id));
  }

  async create(user: AuthUser, input: StockCreateCommand) {
    const item = await this.prisma.stockItem.create({
      data: {
        branchId: user.branchId,
        name: input.name,
        category: input.category,
        unit: input.unit,
        quantity: input.quantity,
        capacity: input.capacity,
        unitCost: input.unitCost,
        salePrice: input.salePrice,
        supplier: input.supplier,
        notes: input.notes || null,
      },
    });
    return this.toStockItem(item);
  }

  async update(user: AuthUser, id: string, input: StockUpdateCommand) {
    const current = await this.findScoped(user, id);
    const quantity = input.quantity ?? current.quantity;
    const capacity = input.capacity ?? current.capacity;
    if (quantity > capacity) {
      throw new BadRequestException('Quantity cannot exceed the capacity');
    }

    const item = await this.prisma.stockItem.update({
      where: { id: current.id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.category !== undefined && { category: input.category }),
        ...(input.unit !== undefined && { unit: input.unit }),
        quantity,
        capacity,
        ...(input.unitCost !== undefined && { unitCost: input.unitCost }),
        ...(input.salePrice !== undefined && { salePrice: input.salePrice }),
        ...(input.supplier !== undefined && {
          supplier: input.supplier,
        }),
        ...(input.notes !== undefined && { notes: input.notes || null }),
      },
    });
    return this.toStockItem(item);
  }

  withTransaction<T>(
    work: (transaction: IStockTransactionRepository) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(async (transaction) => {
      const operations: IStockTransactionRepository = {
        findStockItems: async (user, ids, includeDeleted = false) => {
          return transaction.stockItem.findMany({
            where: {
              id: { in: ids },
              branchId: user.branchId,
              ...(!includeDeleted && { deletedAt: null }),
            },
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
        },
        findSale: async (user, id) => {
          const sale = await transaction.stockSale.findFirst({
            where: { id, branchId: user.branchId },
            include: { items: true },
          });
          return sale ? { items: sale.items } : null;
        },
        restockItem: async (id, quantity, at) => {
          const item = await transaction.stockItem.update({
            where: { id },
            data: { quantity, lastRestockAt: at },
          });
          return this.toStockItem(item);
        },
        decrementStock: async (user, id, quantity) => {
          const result = await transaction.stockItem.updateMany({
            where: {
              id,
              branchId: user.branchId,
              deletedAt: null,
              quantity: { gte: quantity },
            },
            data: { quantity: { decrement: quantity } },
          });
          return result.count === 1;
        },
        setStockQuantity: async (user, id, expectedQuantity, quantity) => {
          const result = await transaction.stockItem.updateMany({
            where: { id, branchId: user.branchId, quantity: expectedQuantity },
            data: { quantity },
          });
          return result.count === 1;
        },
        createSale: async (user, input) => {
          const sale = await transaction.stockSale.create({
            data: {
              branchId: user.branchId,
              soldById: user.id,
              customerName: input.customerName,
              paymentMethod: input.paymentMethod,
              total: input.total,
              items: { create: input.items },
            },
            include: { items: true },
          });
          return this.toStockSale(sale);
        },
        updateSale: async (id, total, items) => {
          await transaction.stockSaleItem.deleteMany({ where: { saleId: id } });
          await transaction.stockSaleItem.createMany({
            data: items.map((item) => ({ saleId: id, ...item })),
          });
          const sale = await transaction.stockSale.update({
            where: { id },
            data: { total },
            include: { items: { orderBy: { itemName: 'asc' } } },
          });
          return this.toStockSale(sale);
        },
      };
      return work(operations);
    });
  }

  async remove(user: AuthUser, id: string) {
    const current = await this.findScoped(user, id);
    await this.prisma.stockItem.update({
      where: { id: current.id },
      data: { deletedAt: new Date() },
    });
    return { id: current.id, deleted: true };
  }

  async listSales(user: AuthUser, query: ListQuery = {}) {
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

  async listCatalog(user: AuthUser, kind: 'category' | 'supplier') {
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
    const existing = await this.prisma.stockCatalogEntry.findFirst({
      where: {
        branchId: user.branchId,
        kind,
        name: { equals: name, mode: 'insensitive' },
      },
      select: { id: true, name: true },
    });
    if (existing) return existing;

    return this.prisma.stockCatalogEntry.create({
      data: { branchId: user.branchId, kind, name },
      select: { id: true, name: true },
    });
  }

  async hasCatalogEntry(
    user: AuthUser,
    kind: 'category' | 'supplier',
    name: string,
  ) {
    const entry = await this.prisma.stockCatalogEntry.findFirst({
      where: {
        branchId: user.branchId,
        kind,
        name: { equals: name, mode: 'insensitive' },
      },
      select: { id: true },
    });
    return entry !== null;
  }

  private async findScoped(user: AuthUser, id: string) {
    const item = await this.prisma.stockItem.findFirst({
      where: { id, branchId: user.branchId, deletedAt: null },
    });
    if (!item) throw new NotFoundException('Stock item not found');
    return item;
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
