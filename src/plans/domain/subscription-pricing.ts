export interface SubscriptionTerm {
  months: number;
  amountCents: bigint;
}

export const SUBSCRIPTION_TERMS: readonly SubscriptionTerm[] = [
  { months: 3, amountCents: 3_000_000n },
  { months: 6, amountCents: 5_500_000n },
  { months: 12, amountCents: 9_000_000n },
];

export interface SubscriptionQuote {
  months: number;
  amount: string;
  originalAmount: string;
  savingsAmount: string;
  discountPercent: string;
  currencyCode: 'AOA';
}

export function quoteSubscription(months: number): SubscriptionQuote {
  const term = SUBSCRIPTION_TERMS.find((option) => option.months === months);
  if (!term) throw new Error(`Unsupported subscription term: ${months}`);

  const originalCents = BigInt(months) * 1_000_000n;
  const savingsCents = originalCents - term.amountCents;
  const discountBasisPoints =
    (savingsCents * 10_000n + originalCents / 2n) / originalCents;

  return {
    months,
    amount: formatCents(term.amountCents),
    originalAmount: formatCents(originalCents),
    savingsAmount: formatCents(savingsCents),
    discountPercent: `${discountBasisPoints / 100n}.${String(
      discountBasisPoints % 100n,
    ).padStart(2, '0')}`,
    currencyCode: 'AOA',
  };
}

export function quoteForPlan(
  months: number,
  amount: string | number,
): SubscriptionQuote {
  const expected = quoteSubscription(months);
  const suppliedCents = parseAmountCents(String(amount));
  const expectedCents = parseAmountCents(expected.amount);
  if (suppliedCents === null || suppliedCents !== expectedCents) {
    throw new Error(
      `Subscription price is invalid for the ${months}-month term`,
    );
  }
  return expected;
}

function parseAmountCents(amount: string): bigint | null {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(amount);
  if (!match) return null;
  const wholeUnits = BigInt(match[1]);
  const fractionalUnits = BigInt((match[2] ?? '').padEnd(2, '0') || '0');
  return wholeUnits * 100n + fractionalUnits;
}

export function formatCents(cents: bigint): string {
  return `${cents / 100n}.${String(cents % 100n).padStart(2, '0')}`;
}

export function addCalendarMonthsUtc(date: Date, months: number): Date {
  const targetMonth = date.getUTCMonth() + months;
  const targetYear = date.getUTCFullYear() + Math.floor(targetMonth / 12);
  const normalizedMonth = targetMonth % 12;
  const lastDay = new Date(
    Date.UTC(targetYear, normalizedMonth + 1, 0),
  ).getUTCDate();
  const result = new Date(date);
  result.setUTCDate(1);
  result.setUTCFullYear(
    targetYear,
    normalizedMonth,
    Math.min(date.getUTCDate(), lastDay),
  );
  return result;
}
