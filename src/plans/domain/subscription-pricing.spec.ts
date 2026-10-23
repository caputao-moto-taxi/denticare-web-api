import {
  addCalendarMonthsUtc,
  quoteForPlan,
  quoteSubscription,
} from './subscription-pricing';

describe('subscription pricing', () => {
  it.each([
    [3, '30000.00', '30000.00', '0.00', '0.00'],
    [6, '55000.00', '60000.00', '5000.00', '8.33'],
    [12, '90000.00', '120000.00', '30000.00', '25.00'],
  ])(
    'quotes the %i-month option without floating point arithmetic',
    (months, amount, originalAmount, savingsAmount, discountPercent) => {
      expect(quoteSubscription(months)).toEqual({
        months,
        amount,
        originalAmount,
        savingsAmount,
        discountPercent,
        currencyCode: 'AOA',
      });
    },
  );

  it('rejects unsupported durations', () => {
    expect(() => quoteSubscription(9)).toThrow(
      'Unsupported subscription term: 9',
    );
  });

  it.each(['30000', '30000.0', '30000.00'])(
    'accepts equivalent decimal representations of the 3-month price (%s)',
    (amount) => {
      expect(() => quoteForPlan(3, amount)).not.toThrow();
    },
  );

  it('rejects a plan price that differs by one cent', () => {
    expect(() => quoteForPlan(3, '30000.01')).toThrow(
      'Subscription price is invalid for the 3-month term',
    );
  });

  it('adds calendar months without overflowing short months', () => {
    expect(
      addCalendarMonthsUtc(new Date('2024-01-31T10:15:00.000Z'), 1),
    ).toEqual(new Date('2024-02-29T10:15:00.000Z'));
    expect(
      addCalendarMonthsUtc(new Date('2025-10-31T10:15:00.000Z'), 4),
    ).toEqual(new Date('2026-02-28T10:15:00.000Z'));
  });
});
