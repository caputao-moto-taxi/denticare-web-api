import { Prisma } from '../../../../../generated/prisma/client';
import { quoteSubscription, SUBSCRIPTION_TERMS } from '../../../../plans/domain/subscription-pricing';

export async function initializeSubscriptionOptions(
  database: Pick<Prisma.TransactionClient, 'plan' | 'currency'>,
) {
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
    throw new Error('The Kwanza currency was removed. Restore it before seeding.');
  }

  await Promise.all(SUBSCRIPTION_TERMS.map(async (term) => {
    const quote = quoteSubscription(term.months);
    const amount = new Prisma.Decimal(quote.amount);
    await database.plan.upsert({
      where: { slug: `subscription-${term.months}-months` },
      create: {
        name: `${term.months} months`,
        slug: `subscription-${term.months}-months`,
        price: Number(quote.amount),
        subscriptionPrice: amount,
        subscriptionMonths: term.months,
        isSubscriptionOption: true,
        currencyId: currency.id,
        duration: term.months * 30,
        total_branch: 1,
      },
      update: {
        subscriptionPrice: amount,
        subscriptionMonths: term.months,
        isSubscriptionOption: true,
        currencyId: currency.id,
        deletedAt: null,
      },
    });
  }));
}
