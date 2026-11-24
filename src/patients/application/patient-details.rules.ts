type FinancialEntry = {
  id: string;
  reference: string;
  description: string;
  amount: number;
  method: string;
  status: string;
  createdAt: Date;
};

type Consult = {
  id: string;
  description: string | null;
  amount: number;
  paidAmount: number | null;
  isPaid: boolean;
  createdAt: Date;
};

export function patientAppointmentStatus(status: string) {
  switch (status) {
    case 'COMPLETED':
      return 'completed';
    case 'PENDING':
    case 'CONFIRMED':
    case 'RESCHEDULED':
      return 'scheduled';
    default:
      return 'cancelled';
  }
}

export function formatPatientMoney(amount: number) {
  return `${amount.toLocaleString('pt-PT', {
    maximumFractionDigits: 2,
  })} Kz`;
}

export function calculatePatientAge(birthDate: Date, today = new Date()) {
  let age = today.getFullYear() - birthDate.getFullYear();
  if (
    today.getMonth() < birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() &&
      today.getDate() < birthDate.getDate())
  ) {
    age--;
  }
  return age;
}

export function patientFinancials(
  entries: FinancialEntry[],
  consults: Consult[],
) {
  return [
    ...entries.map((entry) => ({
      id: entry.id,
      reference: entry.reference,
      description: entry.description,
      amount: formatPatientMoney(entry.amount),
      amountValue: entry.amount,
      paidValue: entry.status === 'paid' ? entry.amount : 0,
      method: entry.method,
      date: entry.createdAt.toISOString(),
      status: entry.status,
    })),
    ...consults.map((consult) => ({
      id: consult.id,
      reference: `CONS-${consult.id.slice(0, 8).toUpperCase()}`,
      description: consult.description ?? 'Consulta',
      amount: formatPatientMoney(consult.paidAmount ?? consult.amount),
      amountValue: consult.amount,
      paidValue: consult.isPaid ? (consult.paidAmount ?? consult.amount) : 0,
      method: '—',
      date: consult.createdAt.toISOString(),
      status: consult.isPaid ? 'paid' : 'pending',
    })),
  ].sort((left, right) => right.date.localeCompare(left.date));
}

export function patientFinancialTotals(
  financials: ReturnType<typeof patientFinancials>,
) {
  return financials.reduce(
    (totals, entry) => ({
      billed: totals.billed + entry.amountValue,
      paid: totals.paid + entry.paidValue,
      pending:
        totals.pending + Math.max(0, entry.amountValue - entry.paidValue),
    }),
    { billed: 0, paid: 0, pending: 0 },
  );
}

export function currentPatientTreatment<
  T extends {
    totalSteps: number;
    completedSteps: number;
  },
>(plans: T[]) {
  return plans.find(
    (plan) => plan.totalSteps === 0 || plan.completedSteps < plan.totalSteps,
  );
}

export function nextPatientAppointment<
  T extends { status: string; date: string; time: string },
>(appointments: T[], now = Date.now()) {
  const appointmentDateTime = (appointment: { date: string; time: string }) =>
    new Date(`${appointment.date.slice(0, 10)}T${appointment.time}:00.000Z`);
  return appointments
    .filter(
      (appointment) =>
        appointment.status === 'scheduled' &&
        appointmentDateTime(appointment).getTime() >= now,
    )
    .sort(
      (left, right) =>
        appointmentDateTime(left).getTime() -
        appointmentDateTime(right).getTime(),
    )[0];
}

export function patientAppointmentDateTime(appointment: {
  date: string;
  time: string;
}) {
  return new Date(
    `${appointment.date.slice(0, 10)}T${appointment.time}:00.000Z`,
  );
}

export function patientTreatmentProgress(
  completedSteps: number,
  totalSteps: number,
) {
  return totalSteps
    ? Math.min(100, Math.round((completedSteps / totalSteps) * 100))
    : 0;
}

export function patientPaymentCompletionPercent(paid: number, billed: number) {
  return billed ? Math.min(100, Math.round((paid / billed) * 100)) : 0;
}

export function groupPatientPrescriptions<
  T extends { id: string; groupId: string | null },
>(prescriptions: T[]) {
  const groups = new Map<string, T[]>();
  for (const prescription of prescriptions) {
    const groupId = prescription.groupId ?? prescription.id;
    const group = groups.get(groupId) ?? [];
    group.push(prescription);
    groups.set(groupId, group);
  }
  return [...groups.entries()];
}
