import {
  calculatePatientAge,
  nextPatientAppointment,
  patientAppointmentStatus,
  patientFinancialTotals,
  patientFinancials,
  patientPaymentCompletionPercent,
  patientTreatmentProgress,
} from './patient-details.rules';

describe('patient details rules', () => {
  it('maps appointment statuses and selects the earliest future scheduled visit', () => {
    expect(patientAppointmentStatus('CONFIRMED')).toBe('scheduled');
    expect(patientAppointmentStatus('COMPLETED')).toBe('completed');
    expect(patientAppointmentStatus('CANCELLED')).toBe('cancelled');

    expect(
      nextPatientAppointment(
        [
          {
            id: 'later',
            status: 'scheduled',
            date: '2026-03-03T00:00:00.000Z',
            time: '10:00',
          },
          {
            id: 'earlier',
            status: 'scheduled',
            date: '2026-03-02T00:00:00.000Z',
            time: '09:30',
          },
          {
            id: 'cancelled',
            status: 'cancelled',
            date: '2026-03-01T00:00:00.000Z',
            time: '09:00',
          },
        ],
        new Date('2026-03-01T00:00:00.000Z').getTime(),
      )?.id,
    ).toBe('earlier');
  });

  it('calculates patient financial totals and completion percentages', () => {
    const financials = patientFinancials(
      [
        {
          id: 'entry-1',
          reference: 'REG-1',
          description: 'Consulta',
          amount: 1000,
          method: 'cash',
          status: 'paid',
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
        },
      ],
      [
        {
          id: '12345678',
          description: null,
          amount: 700,
          paidAmount: 200,
          isPaid: false,
          createdAt: new Date('2026-01-02T00:00:00.000Z'),
        },
      ],
    );

    expect(patientFinancialTotals(financials)).toEqual({
      billed: 1700,
      paid: 1000,
      pending: 700,
    });
    expect(financials[0].reference).toBe('CONS-12345678');
    expect(patientPaymentCompletionPercent(1000, 1700)).toBe(59);
    expect(patientPaymentCompletionPercent(0, 0)).toBe(0);
  });

  it('calculates age by birthday and caps treatment progress at one hundred percent', () => {
    expect(
      calculatePatientAge(
        new Date('2000-11-25T00:00:00.000Z'),
        new Date('2026-11-24T00:00:00.000Z'),
      ),
    ).toBe(25);
    expect(patientTreatmentProgress(6, 4)).toBe(100);
    expect(patientTreatmentProgress(0, 0)).toBe(0);
  });
});
