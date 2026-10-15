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
    count: jest.fn().mockResolvedValue(1),
    create: jest.fn(),
  };
  const prisma = {
    stockItem,
    stockSale,
    $transaction: jest.fn(
      (operation: Promise<unknown>[] | ((tx: unknown) => unknown)) =>
        Array.isArray(operation)
          ? Promise.all(operation)
          : operation({ stockItem, stockSale }),
    ),
  } as unknown as PrismaService;
  const repository = new StockPrismaRepository(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
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
});
