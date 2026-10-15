import { Prisma } from '../../../../../generated/prisma/client';

export async function initializeSubscriptionPlan(
  database: Pick<Prisma.TransactionClient, 'plan' | 'currency'>,
) {
  const existing = await database.plan.findFirst({
    where: { deletedAt: null },
    orderBy: { createdAt: 'asc' },
    select: { id: true, name: true },
  });
  if (existing) return existing;

  const currency =
    (await database.currency.findFirst({
      where: { name: 'Kwanza', symbol: 'Kz', deletedAt: null },
      select: { id: true },
    })) ??
    (await database.currency.upsert({
      where: { id: '0d7c52e7-e89e-4a51-b56e-749af5313e4a' },
      create: {
        id: '0d7c52e7-e89e-4a51-b56e-749af5313e4a',
        name: 'Kwanza',
        symbol: 'Kz',
      },
      update: {},
      select: { id: true, deletedAt: true },
    }));
  if ('deletedAt' in currency && currency.deletedAt) {
    throw new Error(
      'The initial Kwanza currency was removed. Restore it before seeding.',
    );
  }

  const plan = await database.plan.upsert({
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
    select: { id: true, name: true, deletedAt: true },
  });
  if (plan.deletedAt) {
    throw new Error(
      'The Essencial plan was removed. Restore it or configure another plan before seeding.',
    );
  }

  return { id: plan.id, name: plan.name };
}
