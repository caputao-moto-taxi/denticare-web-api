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

  async list(user: AuthUser, query: ListQuery = {}) {
    this.requireStaff(user);
    validateListFilters(query, {
      category: ['protection', 'anesthesia', 'instruments', 'materials'],
    });
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

  private async findScoped(user: AuthUser, id: string) {
    const item = await this.prisma.stockItem.findFirst({
      where: { id, branchId: user.branchId, deletedAt: null },
    });
    if (!item) throw new NotFoundException('Stock item not found');
    return item;
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
