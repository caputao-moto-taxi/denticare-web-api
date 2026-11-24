import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { AuthUser } from '../../auth/auth-user';
import { IStockRepository } from '../domain/stock.repository';
import { CreateStockItemUseCase } from './useCases/create-stock-item/create-stock-item-use-case';
import { CreateStockSaleUseCase } from './useCases/create-stock-sale/create-stock-sale-use-case';
import { GetStockSalesSummaryUseCase } from './useCases/get-stock-sales-summary/get-stock-sales-summary-use-case';
import { GetStockSummaryUseCase } from './useCases/get-stock-summary/get-stock-summary-use-case';
import { ListStockUseCase } from './useCases/list-stock/list-stock-use-case';
import { RemoveStockItemUseCase } from './useCases/remove-stock-item/remove-stock-item-use-case';
import { RestockStockItemUseCase } from './useCases/restock-stock-item/restock-stock-item-use-case';
import { UpdateStockSaleUseCase } from './useCases/update-stock-sale/update-stock-sale-use-case';

describe('Stock use cases', () => {
  const user: AuthUser = {
    id: 'user-1',
    email: 'staff@example.test',
    role: 'nurse',
    branchId: 'branch-1',
  };
  const transaction = {
    findStockItems: jest.fn(),
    findSale: jest.fn(),
    restockItem: jest.fn(),
    decrementStock: jest.fn(),
    setStockQuantity: jest.fn(),
    createSale: jest.fn(),
    updateSale: jest.fn(),
  };
  const repository = {
    hasCatalogEntry: jest.fn().mockResolvedValue(true),
    create: jest.fn(),
    list: jest.fn(),
    remove: jest.fn(),
    summary: jest.fn(),
    salesSummary: jest.fn(),
    withTransaction: jest.fn((work) => work(transaction)),
  } as unknown as jest.Mocked<IStockRepository>;

  beforeEach(() => jest.clearAllMocks());

  it('applies create defaults and normalized text before persistence', async () => {
    (repository.create as jest.Mock).mockResolvedValue({ id: 'item-1' });
    const useCase = new CreateStockItemUseCase(repository);

    await useCase.execute({
      user,
      input: {
        name: ' Gloves ',
        category: 'protection',
        unit: 'box',
        quantity: 10,
        unitCost: 3500,
        supplier: ' MedSupply ',
      },
    });

    expect(repository.create).toHaveBeenCalledWith(
      user,
      expect.objectContaining({
        name: 'Gloves',
        supplier: 'MedSupply',
        capacity: 10,
        salePrice: 3500,
      }),
    );
  });

  it('rejects invalid capacity and unregistered catalog entries without writing', async () => {
    const useCase = new CreateStockItemUseCase(repository);
    const input = {
      name: 'Gloves',
      category: 'protection',
      unit: 'box' as const,
      quantity: 20,
      capacity: 10,
      unitCost: 1,
      supplier: 'MedSupply',
    };

    await expect(useCase.execute({ user, input })).rejects.toThrow(
      BadRequestException,
    );
    expect(repository.create).not.toHaveBeenCalled();

    (repository.hasCatalogEntry as jest.Mock).mockResolvedValueOnce(false);
    await expect(
      useCase.execute({ user, input: { ...input, quantity: 5 } }),
    ).rejects.toThrow(BadRequestException);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('validates access, sale uniqueness, and supported list filters in the application layer', async () => {
    const createSale = new CreateStockSaleUseCase(repository);
    expect(() =>
      createSale.execute({
        user,
        input: {
          paymentMethod: 'cash',
          items: [
            { stockItemId: 'item-1', quantity: 1 },
            { stockItemId: 'item-1', quantity: 2 },
          ],
        },
      }),
    ).toThrow(BadRequestException);
    expect(repository.withTransaction).not.toHaveBeenCalled();

    const list = new ListStockUseCase(repository);
    expect(() =>
      list.execute({ user: { ...user, role: 'patient' }, query: {} }),
    ).toThrow(ForbiddenException);
    expect(() =>
      list.execute({
        user,
        query: {
          category: 'unknown',
          dateFrom: '2026-02-02',
          dateTo: '2026-02-01',
        },
      }),
    ).toThrow(BadRequestException);
    expect(repository.list).not.toHaveBeenCalled();
  });

  it('restricts stock deletion to clinic administrators before persistence', async () => {
    const useCase = new RemoveStockItemUseCase(repository);
    expect(() => useCase.execute({ user, id: 'item-1' })).toThrow(
      ForbiddenException,
    );
    expect(repository.remove).not.toHaveBeenCalled();
  });

  it('calculates inventory summary in the application layer', async () => {
    (repository.summary as jest.Mock).mockResolvedValue([
      { quantity: 2, capacity: 10, unitCost: 5 },
      { quantity: 8, capacity: 10, unitCost: 4 },
    ]);

    await expect(
      new GetStockSummaryUseCase(repository).execute(user),
    ).resolves.toEqual({
      productCount: 2,
      totalUnits: 10,
      lowStockCount: 1,
      inventoryCost: 42,
    });
  });

  it('maps sales summary data into the API response in the application layer', async () => {
    (repository.salesSummary as jest.Mock).mockResolvedValue({
      totals: {
        _count: { _all: 2 },
        _sum: { total: 8000 },
        _avg: { total: 4000 },
      },
      recentSales: [],
      paymentMethods: [
        {
          paymentMethod: 'cash',
          _count: { _all: 2 },
          _sum: { total: 8000 },
        },
      ],
      topProducts: [
        {
          stockItemId: 'item-1',
          itemName: 'Gloves',
          _sum: { quantity: 3, totalPrice: 12000 },
        },
      ],
    });

    await expect(
      new GetStockSalesSummaryUseCase(repository).execute(user),
    ).resolves.toMatchObject({
      totalSales: 2,
      totalRevenue: 8000,
      averageTicket: 4000,
      salesByDay: expect.arrayContaining([
        expect.objectContaining({ count: 0, revenue: 0 }),
      ]),
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
    expect(repository.salesSummary).toHaveBeenCalledWith(
      user,
      expect.any(Date),
    );
  });

  it('rejects restocks beyond capacity inside the transaction before writing', async () => {
    (transaction.findStockItems as jest.Mock).mockResolvedValue([
      { id: 'item-1', quantity: 15, capacity: 40 },
    ]);

    await expect(
      new RestockStockItemUseCase(repository).execute({
        user,
        id: 'item-1',
        input: { amount: 30 },
      }),
    ).rejects.toThrow(BadRequestException);
    expect(repository.withTransaction).toHaveBeenCalled();
    expect(transaction.restockItem).not.toHaveBeenCalled();
  });

  it('prices a sale and decrements stock within one transaction', async () => {
    (transaction.findStockItems as jest.Mock).mockResolvedValue([
      {
        id: 'item-1',
        name: 'Gloves',
        unit: 'box',
        quantity: 15,
        capacity: 40,
        salePrice: 40,
        deletedAt: null,
      },
    ]);
    (transaction.decrementStock as jest.Mock).mockResolvedValue(true);
    (transaction.createSale as jest.Mock).mockResolvedValue({
      id: 'sale-1',
      total: 80,
    });

    await expect(
      new CreateStockSaleUseCase(repository).execute({
        user,
        input: {
          customerName: ' Customer ',
          paymentMethod: 'cash',
          items: [{ stockItemId: 'item-1', quantity: 2 }],
        },
      }),
    ).resolves.toEqual({ id: 'sale-1', total: 80 });
    expect(transaction.decrementStock).toHaveBeenCalledWith(user, 'item-1', 2);
    expect(transaction.createSale).toHaveBeenCalledWith(user, {
      customerName: 'Customer',
      paymentMethod: 'cash',
      total: 80,
      items: [
        {
          stockItemId: 'item-1',
          itemName: 'Gloves',
          unit: 'box',
          quantity: 2,
          unitPrice: 40,
          totalPrice: 80,
        },
      ],
    });
  });

  it('restores sale stock and preserves snapshot prices during updates', async () => {
    (transaction.findSale as jest.Mock).mockResolvedValue({
      items: [
        {
          stockItemId: 'item-1',
          itemName: 'Gloves',
          unit: 'box',
          quantity: 2,
          unitPrice: 40,
          totalPrice: 80,
        },
      ],
    });
    (transaction.findStockItems as jest.Mock).mockResolvedValue([
      {
        id: 'item-1',
        name: 'Gloves',
        unit: 'box',
        quantity: 8,
        capacity: 40,
        salePrice: 50,
        deletedAt: null,
      },
    ]);
    (transaction.setStockQuantity as jest.Mock).mockResolvedValue(true);
    (transaction.updateSale as jest.Mock).mockResolvedValue({
      id: 'sale-1',
      total: 40,
    });

    await expect(
      new UpdateStockSaleUseCase(repository).execute({
        user,
        id: 'sale-1',
        input: { items: [{ stockItemId: 'item-1', quantity: 1 }] },
      }),
    ).resolves.toEqual({ id: 'sale-1', total: 40 });
    expect(transaction.setStockQuantity).toHaveBeenCalledWith(
      user,
      'item-1',
      8,
      9,
    );
    expect(transaction.updateSale).toHaveBeenCalledWith('sale-1', 40, [
      expect.objectContaining({ unitPrice: 40, totalPrice: 40 }),
    ]);
  });
});
