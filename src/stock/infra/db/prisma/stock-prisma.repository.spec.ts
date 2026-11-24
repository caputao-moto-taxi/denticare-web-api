import { NotFoundException } from '@nestjs/common';
import { AuthUser } from '../../../../auth/auth-user';
import { PrismaService } from '../../../../shared/infra/db/prisma/prisma.service';
import { StockPrismaRepository } from './stock-prisma.repository';

describe('StockPrismaRepository', () => {
  const staff: AuthUser = {
    id: 'user-1',
    email: 'staff@example.test',
    role: 'nurse',
    branchId: 'branch-1',
  };
  const item = {
    id: 'item-1',
    name: 'Gloves',
    category: 'protection',
    unit: 'box',
    quantity: 15,
    capacity: 40,
    unitCost: 3500,
    salePrice: 4000,
    supplier: 'MedSupply',
    notes: null,
    lastRestockAt: new Date('2026-01-01T00:00:00Z'),
  };

  const stockItem = {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    count: jest.fn().mockResolvedValue(1),
  };
  const stockSale = {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    count: jest.fn().mockResolvedValue(1),
    aggregate: jest.fn(),
    groupBy: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };
  const stockSaleItem = {
    groupBy: jest.fn(),
    deleteMany: jest.fn(),
    createMany: jest.fn(),
  };
  const stockCatalogEntry = {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
  };
  const prisma = {
    stockItem,
    stockSale,
    stockSaleItem,
    stockCatalogEntry,
    $transaction: jest.fn(
      (operation: Promise<unknown>[] | ((tx: unknown) => unknown)) =>
        Array.isArray(operation)
          ? Promise.all(operation)
          : operation({
              stockItem,
              stockSale,
              stockSaleItem,
              stockCatalogEntry,
            }),
    ),
  } as unknown as PrismaService;
  const repository = new StockPrismaRepository(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
    stockCatalogEntry.findFirst.mockResolvedValue({ id: 'catalog-1' });
  });

  it('lists only catalog entries for the caller branch', async () => {
    stockCatalogEntry.findMany.mockResolvedValue([
      { id: 'category-1', name: 'Protection' },
    ]);

    await repository.listCatalog(staff, 'category');

    expect(stockCatalogEntry.findMany).toHaveBeenCalledWith({
      where: { branchId: 'branch-1', kind: 'category' },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      select: { id: true, name: true },
    });
  });

  it('creates catalog entries for the caller branch only', async () => {
    stockCatalogEntry.findFirst.mockResolvedValueOnce(null);
    stockCatalogEntry.create.mockResolvedValue({
      id: 'supplier-1',
      name: 'New Supplier',
    });

    await repository.createCatalog(staff, 'supplier', 'New Supplier');

    expect(stockCatalogEntry.findFirst).toHaveBeenCalledWith({
      where: {
        branchId: 'branch-1',
        kind: 'supplier',
        name: { equals: 'New Supplier', mode: 'insensitive' },
      },
      select: { id: true, name: true },
    });
    expect(stockCatalogEntry.create).toHaveBeenCalledWith({
      data: {
        branchId: 'branch-1',
        kind: 'supplier',
        name: 'New Supplier',
      },
      select: { id: true, name: true },
    });
  });

  it('summarizes only the caller branch inventory', async () => {
    stockItem.findMany.mockResolvedValue([
      { quantity: 2, capacity: 10, unitCost: 5 },
      { quantity: 8, capacity: 10, unitCost: 4 },
    ]);

    await expect(repository.summary(staff)).resolves.toEqual([
      { quantity: 2, capacity: 10, unitCost: 5 },
      { quantity: 8, capacity: 10, unitCost: 4 },
    ]);
    expect(stockItem.findMany).toHaveBeenCalledWith({
      where: { branchId: 'branch-1', deletedAt: null },
      select: { quantity: true, capacity: true, unitCost: true },
    });
  });

  it('summarizes sales and top products only for the caller branch', async () => {
    const today = new Date();
    stockSale.aggregate.mockResolvedValue({
      _count: { _all: 2 },
      _sum: { total: 8000 },
      _avg: { total: 4000 },
    });
    stockSale.findMany.mockResolvedValue([{ createdAt: today, total: 4000 }]);
    stockSale.groupBy.mockResolvedValue([
      { paymentMethod: 'cash', _count: { _all: 2 }, _sum: { total: 8000 } },
    ]);
    stockSaleItem.groupBy.mockResolvedValue([
      {
        stockItemId: 'item-1',
        itemName: 'Gloves',
        _sum: { quantity: 3, totalPrice: 12000 },
      },
    ]);

    const startDate = new Date('2026-01-01T00:00:00.000Z');
    const result = await repository.salesSummary(staff, startDate);

    expect(result).toMatchObject({
      totals: { _count: { _all: 2 }, _sum: { total: 8000 } },
      recentSales: [{ total: 4000 }],
      paymentMethods: [
        { paymentMethod: 'cash', _count: { _all: 2 }, _sum: { total: 8000 } },
      ],
      topProducts: [
        {
          stockItemId: 'item-1',
          itemName: 'Gloves',
          _sum: { quantity: 3, totalPrice: 12000 },
        },
      ],
    });
    expect(stockSale.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { branchId: 'branch-1' } }),
    );
    expect(stockSale.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { branchId: 'branch-1', createdAt: { gte: startDate } },
      }),
    );
    expect(stockSale.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({ where: { branchId: 'branch-1' } }),
    );
    expect(stockSaleItem.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { sale: { branchId: 'branch-1' } },
      }),
    );
  });

  it('only lists items of the caller branch', async () => {
    stockItem.findMany.mockResolvedValue([item]);

    await repository.list(staff);

    expect(stockItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { branchId: 'branch-1', deletedAt: null, createdAt: {} },
      }),
    );
  });

  it('does not reach items of another branch', async () => {
    stockItem.findFirst.mockResolvedValue(null);

    await expect(
      repository.findOne(staff, 'foreign-item'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(stockItem.findFirst).toHaveBeenCalledWith({
      where: { id: 'foreign-item', branchId: 'branch-1', deletedAt: null },
    });
  });

  it('exposes stock-changing transaction primitives without embedding sale rules', async () => {
    stockItem.findMany.mockResolvedValue([item]);
    stockItem.updateMany.mockResolvedValue({ count: 1 });
    stockItem.update.mockResolvedValue({ ...item, quantity: 40 });
    stockSale.create.mockResolvedValue({
      id: 'sale-1',
      customerName: null,
      paymentMethod: 'cash',
      total: 8000,
      createdAt: new Date('2026-01-02T00:00:00Z'),
      items: [],
    });

    await repository.withTransaction(async (transaction) => {
      const items = await transaction.findStockItems(staff, ['item-1']);
      expect(items).toHaveLength(1);
      expect(await transaction.decrementStock(staff, 'item-1', 2)).toBe(true);
      return transaction.restockItem('item-1', 40, new Date());
    });

    expect(stockItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: { in: ['item-1'] },
          branchId: 'branch-1',
          deletedAt: null,
        },
      }),
    );
    expect(stockItem.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'item-1',
        branchId: 'branch-1',
        deletedAt: null,
        quantity: { gte: 2 },
      },
      data: { quantity: { decrement: 2 } },
    });
    expect(stockItem.update).toHaveBeenCalledWith({
      where: { id: 'item-1' },
      data: { quantity: 40, lastRestockAt: expect.any(Date) },
    });
    expect(prisma.$transaction).toHaveBeenCalled();
  });
});
