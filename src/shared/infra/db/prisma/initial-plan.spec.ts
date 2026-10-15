import { PrismaPg } from '@prisma/adapter-pg';
import {
  Currency,
  Plan,
  PrismaClient,
} from '../../../../../generated/prisma/client';
import { initializeSubscriptionPlan } from './initial-plan';

describe('initializeSubscriptionPlan', () => {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({
      connectionString: 'postgresql://test:test@localhost:5432/test',
    }),
  });
  const now = new Date('2026-10-14T00:00:00.000Z');
  const currency: Currency = {
    id: 'currency-id',
    name: 'Kwanza',
    symbol: 'Kz',
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
  const plan: Plan = {
    id: 'plan-id',
    name: 'Essencial',
    slug: 'essencial',
    price: 15000,
    currencyId: currency.id,
    duration: 30,
    total_branch: 1,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    isOnPromotion: false,
    promotionalPrice: null,
    promotionEndDate: null,
    promotionStartDate: null,
    promotionPercentage: null,
  };

  beforeEach(() => {
    jest.spyOn(prisma.plan, 'findFirst').mockResolvedValue(null);
    jest.spyOn(prisma.currency, 'findFirst').mockResolvedValue(null);
    jest.spyOn(prisma.currency, 'upsert').mockResolvedValue(currency);
    jest.spyOn(prisma.plan, 'upsert').mockResolvedValue(plan);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('creates a Kwanza plan with the agreed initial terms', async () => {
    await expect(initializeSubscriptionPlan(prisma)).resolves.toEqual({
      id: plan.id,
      name: plan.name,
    });
    expect(prisma.currency.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ name: 'Kwanza', symbol: 'Kz' }),
        update: {},
      }),
    );
    expect(prisma.plan.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { slug: 'essencial' },
        create: {
          name: 'Essencial',
          slug: 'essencial',
          price: 15000,
          currencyId: currency.id,
          duration: 30,
          total_branch: 1,
        },
        update: {},
      }),
    );
  });

  it('preserves existing plans and does not create duplicates on repeat runs', async () => {
    jest.spyOn(prisma.plan, 'findFirst').mockResolvedValue(plan);

    await expect(initializeSubscriptionPlan(prisma)).resolves.toMatchObject({
      id: plan.id,
    });
    expect(prisma.currency.findFirst).not.toHaveBeenCalled();
    expect(prisma.currency.upsert).not.toHaveBeenCalled();
    expect(prisma.plan.upsert).not.toHaveBeenCalled();
  });

  it('reuses an existing Kwanza currency', async () => {
    jest.spyOn(prisma.currency, 'findFirst').mockResolvedValue(currency);

    await initializeSubscriptionPlan(prisma);

    expect(prisma.currency.upsert).not.toHaveBeenCalled();
    expect(prisma.plan.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ currencyId: currency.id }),
      }),
    );
  });

  it('does not silently reactivate a removed initial plan', async () => {
    jest.spyOn(prisma.plan, 'upsert').mockResolvedValue({
      ...plan,
      deletedAt: now,
    });

    await expect(initializeSubscriptionPlan(prisma)).rejects.toThrow(
      'The Essencial plan was removed.',
    );
  });

  it('does not create a plan with a removed initial currency', async () => {
    jest.spyOn(prisma.currency, 'upsert').mockResolvedValue({
      ...currency,
      deletedAt: now,
    });

    await expect(initializeSubscriptionPlan(prisma)).rejects.toThrow(
      'The initial Kwanza currency was removed.',
    );
    expect(prisma.plan.upsert).not.toHaveBeenCalled();
  });

  it('propagates database failures instead of reporting success', async () => {
    jest
      .spyOn(prisma.plan, 'findFirst')
      .mockRejectedValue(new Error('Database unavailable'));

    await expect(initializeSubscriptionPlan(prisma)).rejects.toThrow(
      'Database unavailable',
    );
    expect(prisma.plan.upsert).not.toHaveBeenCalled();
  });
});
