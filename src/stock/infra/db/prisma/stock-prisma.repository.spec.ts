import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
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

    await repository.createCatalog(staff, 'supplier', '  New   Supplier ');

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

    await expect(repository.summary(staff)).resolves.toEqual({
      productCount: 2,
      totalUnits: 10,
      lowStockCount: 1,
      inventoryCost: 42,
    });
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

    const result = await repository.salesSummary(staff);

    expect(result).toMatchObject({
      totalSales: 2,
      totalRevenue: 8000,
      averageTicket: 4000,
      paymentMethods: [{ method: 'cash', count: 2, revenue: 8000 }],
      topProducts: [
        {
          stockItemId: 'item-1',
          itemName: 'Gloves',
          quantity: 3,
          revenue: 12000,
        },
      ],
    });
    expect(stockSale.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { branchId: 'branch-1' } }),
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

  it('rejects a product category that is not registered for the caller branch', async () => {
    stockCatalogEntry.findFirst.mockResolvedValue(null);

    await expect(
      repository.create(staff, {
        name: 'Gloves',
        category: 'Other clinic category',
        unit: 'box',
        quantity: 10,
        unitCost: 3500,
        supplier: 'MedSupply',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(stockItem.create).not.toHaveBeenCalled();
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

  it('rejects accounts that are not clinic staff', async () => {
    await expect(
      repository.list({ ...staff, role: 'patient' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('defaults the capacity to the initial quantity', async () => {
    stockItem.create.mockResolvedValue({ ...item, quantity: 10, capacity: 10 });

    await repository.create(staff, {
      name: ' Gloves ',
      category: 'protection',
      unit: 'box',
      quantity: 10,
      unitCost: 3500,
      supplier: 'MedSupply',
    });

    expect(stockItem.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        branchId: 'branch-1',
        name: 'Gloves',
        capacity: 10,
        salePrice: 3500,
      }),
    });
  });

  it('rejects an initial quantity above the capacity', async () => {
    await expect(
      repository.create(staff, {
        name: 'Gloves',
        category: 'protection',
        unit: 'box',
        quantity: 20,
        capacity: 10,
        unitCost: 1,
        supplier: 'MedSupply',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('restocks up to the capacity when no amount is given', async () => {
    stockItem.findFirst.mockResolvedValue(item);
    stockItem.update.mockResolvedValue({ ...item, quantity: 40 });

    const result = await repository.restock(staff, 'item-1', {});

    expect(stockItem.update).toHaveBeenCalledWith({
      where: { id: 'item-1' },
      data: { quantity: 40, lastRestockAt: expect.any(Date) },
    });
    expect(result).toMatchObject({ quantity: 40, capacity: 40 });
  });

  it('refuses to restock beyond the capacity', async () => {
    stockItem.findFirst.mockResolvedValue(item);

    await expect(
      repository.restock(staff, 'item-1', { amount: 30 }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(stockItem.update).not.toHaveBeenCalled();
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

  it('allows only administrators to remove items', async () => {
    await expect(repository.remove(staff, 'item-1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('records a sale with price snapshots and decrements stock atomically', async () => {
    stockItem.findMany.mockResolvedValue([item]);
    stockItem.updateMany.mockResolvedValue({ count: 1 });
    stockSale.create.mockResolvedValue({
      id: 'sale-1',
      customerName: null,
      paymentMethod: 'cash',
      total: 8000,
      createdAt: new Date('2026-01-02T00:00:00Z'),
      items: [
        {
          stockItemId: 'item-1',
          itemName: 'Gloves',
          unit: 'box',
          quantity: 2,
          unitPrice: 4000,
          totalPrice: 8000,
        },
      ],
    });

    const sale = await repository.createSale(staff, {
      paymentMethod: 'cash',
      items: [{ stockItemId: 'item-1', quantity: 2 }],
    });

    expect(stockItem.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'item-1',
        branchId: 'branch-1',
        deletedAt: null,
        quantity: { gte: 2 },
      },
      data: { quantity: { decrement: 2 } },
    });
    expect(stockSale.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        branchId: 'branch-1',
        soldById: 'user-1',
        total: 8000,
        items: {
          create: [
            expect.objectContaining({
              stockItemId: 'item-1',
              itemName: 'Gloves',
              quantity: 2,
              unitPrice: 4000,
              totalPrice: 8000,
            }),
          ],
        },
      }),
      include: { items: true },
    });
    expect(sale).toMatchObject({ id: 'sale-1', total: 8000 });
  });

  it('rejects a sale if there is not enough stock', async () => {
    stockItem.findMany.mockResolvedValue([item]);
    stockItem.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      repository.createSale(staff, {
        paymentMethod: 'cash',
        items: [{ stockItemId: 'item-1', quantity: 20 }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(stockSale.create).not.toHaveBeenCalled();
  });

  it('does not sell stock from another branch', async () => {
    stockItem.findMany.mockResolvedValue([]);

    await expect(
      repository.createSale(staff, {
        paymentMethod: 'cash',
        items: [{ stockItemId: 'foreign-item', quantity: 1 }],
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(stockItem.updateMany).not.toHaveBeenCalled();
  });

  it('rejects duplicate stock items in the same sale', async () => {
    await expect(
      repository.createSale(staff, {
        paymentMethod: 'cash',
        items: [
          { stockItemId: 'item-1', quantity: 1 },
          { stockItemId: 'item-1', quantity: 2 },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('updates sale items and stock atomically while preserving existing prices', async () => {
    const sale = {
      id: 'sale-1',
      branchId: 'branch-1',
      customerName: 'Customer',
      paymentMethod: 'cash',
      total: 8000,
      createdAt: new Date('2026-01-02T00:00:00Z'),
      items: [
        {
          id: 'line-1',
          saleId: 'sale-1',
          stockItemId: 'item-1',
          itemName: 'Gloves',
          unit: 'box',
          quantity: 2,
          unitPrice: 4000,
          totalPrice: 8000,
        },
      ],
    };
    const addedItem = {
      ...item,
      id: 'item-2',
      name: 'Masks',
      quantity: 10,
      capacity: 20,
      salePrice: 2500,
      deletedAt: null,
    };
    stockSale.findFirst.mockResolvedValue(sale);
    stockItem.findMany.mockResolvedValue([
      { ...item, quantity: 8, deletedAt: null },
      addedItem,
    ]);
    stockItem.updateMany.mockResolvedValue({ count: 1 });
    stockSale.update.mockResolvedValue({
      ...sale,
      total: 6500,
      items: [
        { ...sale.items[0], quantity: 1, totalPrice: 4000 },
        {
          stockItemId: 'item-2',
          itemName: 'Masks',
          unit: 'box',
          quantity: 1,
          unitPrice: 2500,
          totalPrice: 2500,
        },
      ],
    });

    const result = await repository.updateSale(staff, 'sale-1', {
      items: [
        { stockItemId: 'item-1', quantity: 1 },
        { stockItemId: 'item-2', quantity: 1 },
      ],
    });

    expect(stockSale.findFirst).toHaveBeenCalledWith({
      where: { id: 'sale-1', branchId: 'branch-1' },
      include: { items: true },
    });
    expect(stockItem.updateMany).toHaveBeenNthCalledWith(1, {
      where: { id: 'item-1', branchId: 'branch-1', quantity: 8 },
      data: { quantity: 9 },
    });
    expect(stockItem.updateMany).toHaveBeenNthCalledWith(2, {
      where: { id: 'item-2', branchId: 'branch-1', quantity: 10 },
      data: { quantity: 9 },
    });
    expect(stockSaleItem.deleteMany).toHaveBeenCalledWith({
      where: { saleId: 'sale-1' },
    });
    expect(stockSaleItem.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          stockItemId: 'item-1',
          quantity: 1,
          unitPrice: 4000,
          totalPrice: 4000,
        }),
        expect.objectContaining({
          stockItemId: 'item-2',
          quantity: 1,
          unitPrice: 2500,
          totalPrice: 2500,
        }),
      ],
    });
    expect(stockSale.update).toHaveBeenCalledWith({
      where: { id: 'sale-1' },
      data: { total: 6500 },
      include: { items: { orderBy: { itemName: 'asc' } } },
    });
    expect(result).toMatchObject({ id: 'sale-1', total: 6500 });
  });

  it('does not edit a sale from another branch', async () => {
    stockSale.findFirst.mockResolvedValue(null);

    await expect(
      repository.updateSale(staff, 'foreign-sale', {
        items: [{ stockItemId: 'item-1', quantity: 1 }],
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(stockItem.findMany).not.toHaveBeenCalled();
  });
});
