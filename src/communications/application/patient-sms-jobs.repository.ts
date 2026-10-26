export type PatientSmsNotification = {
  id: string;
  attempts: number;
  eventType: string;
  payload: unknown;
};

export type ReminderAppointmentCandidate = {
  id: string;
  date: Date;
  time: Date;
  patient: { phoneNumber: string | null };
};

export type ReminderAppointmentRecord = {
  date: Date;
  time: Date;
  status: string;
  deletedAt: Date | null;
  patient: {
    phoneNumber: string | null;
    isActive: boolean;
    deletedAt: Date | null;
  };
  doctor: { branch: { timezone: string } };
};

export type BirthdayCandidate = {
  id: string;
  firstName: string;
  birthDate: Date | null;
  phoneNumber: string | null;
};

export type BirthdayPatientRecord = {
  firstName: string;
  birthDate: Date | null;
  phoneNumber: string | null;
  marketingSmsConsent: boolean;
  isActive: boolean;
  deletedAt: Date | null;
  Role: { slug: string } | null;
  branch: { timezone: string };
};

export abstract class PatientSmsJobsRepository {
  abstract listActiveBranches(): Promise<{ id: string; timezone: string }[]>;
  abstract findReminderAppointments(
    branchId: string,
    dayFrom: Date,
    dayTo: Date,
  ): Promise<ReminderAppointmentCandidate[]>;
  abstract findBirthdayCandidates(
    branchId: string,
  ): Promise<BirthdayCandidate[]>;
  abstract enqueueNotification(input: {
    dedupeKey: string;
    recipient: string;
    eventType: string;
    payload: Record<string, string>;
    nextAttemptAt: Date;
  }): Promise<void>;
  abstract claimNotifications(
    eventTypes: string[],
    staleLock: Date,
    limit: number,
  ): Promise<PatientSmsNotification[]>;
  abstract findReminderAppointment(
    appointmentId: string,
  ): Promise<ReminderAppointmentRecord | null>;
  abstract findBirthdayPatient(
    patientId: string,
  ): Promise<BirthdayPatientRecord | null>;
  abstract markNotificationSent(id: string, sentAt: Date): Promise<void>;
  abstract scheduleNotificationRetry(
    id: string,
    attempts: number,
    nextAttemptAt: Date,
  ): Promise<void>;
}
