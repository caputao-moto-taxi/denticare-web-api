import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { clinicNow } from '../shared/helpers/schedule';
import { toE164 } from './domain/communication-contact';
import { CommunicationDeliveryGateway } from './application/communication-delivery.gateway';
import {
  PatientSmsJobsRepository,
  PatientSmsNotification,
} from './application/patient-sms-jobs.repository';

const APPOINTMENT_REMINDER_EVENT = 'PATIENT_APPOINTMENT_REMINDER_SMS';
const BIRTHDAY_EVENT = 'PATIENT_BIRTHDAY_SMS';
const REMINDER_WINDOW_MS = 60_000;

@Injectable()
export class PatientSmsJobsService {
  private readonly logger = new Logger(PatientSmsJobsService.name);
  private readonly birthdayScans = new Map<string, string>();
  private isRunning = false;

  constructor(
    private readonly repository: PatientSmsJobsRepository,
    private readonly delivery: CommunicationDeliveryGateway,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async runPatientSmsJobs() {
    if (this.isRunning) return;
    this.isRunning = true;
    try {
      const branches = await this.repository.listActiveBranches();
      const now = new Date();

      for (const branch of branches) {
        await this.queueAppointmentReminders(branch, now);
        await this.queueBirthdays(branch, now);
      }

      const notifications = await this.repository.claimNotifications(
        [APPOINTMENT_REMINDER_EVENT, BIRTHDAY_EVENT],
        new Date(Date.now() - 10 * 60_000),
        20,
      );
      await Promise.all(
        notifications.map((notification) =>
          this.deliverNotification(notification),
        ),
      );
    } catch (error) {
      this.logger.error(
        'Could not process patient SMS notifications',
        error instanceof Error ? error.stack : undefined,
      );
    } finally {
      this.isRunning = false;
    }
  }

  private async queueAppointmentReminders(
    branch: { id: string; timezone: string },
    now: Date,
  ) {
    const localMinute = clinicNow(branch.timezone, now);
    localMinute.setUTCSeconds(0, 0);
    const appointmentFrom = new Date(
      localMinute.getTime() + 24 * 60 * 60 * 1000,
    );
    const appointmentTo = new Date(
      appointmentFrom.getTime() + REMINDER_WINDOW_MS,
    );
    const dayFrom = this.startOfDay(appointmentFrom);
    const dayTo = this.startOfDay(appointmentTo);
    const appointments = await this.repository.findReminderAppointments(
      branch.id,
      dayFrom,
      dayTo,
    );

    await Promise.all(
      appointments.map(async (appointment) => {
        const scheduledAt = this.appointmentDateTime(
          appointment.date,
          appointment.time,
        );
        if (scheduledAt < appointmentFrom || scheduledAt >= appointmentTo) {
          return;
        }
        const recipient = appointment.patient.phoneNumber
          ? toE164(appointment.patient.phoneNumber)
          : null;
        if (!recipient) return;

        const scheduledAtIso = scheduledAt.toISOString();
        await this.repository.enqueueNotification({
          dedupeKey: `appointment:${appointment.id}:reminder:${scheduledAtIso}`,
          recipient,
          eventType: APPOINTMENT_REMINDER_EVENT,
          payload: {
            appointmentId: appointment.id,
            scheduledAt: scheduledAtIso,
            timezone: branch.timezone,
          },
          nextAttemptAt: now,
        });
      }),
    );
  }

  private async queueBirthdays(
    branch: { id: string; timezone: string },
    now: Date,
  ) {
    const localNow = clinicNow(branch.timezone, now);
    if (localNow.getUTCHours() < 9) return;

    const today = this.dateKey(localNow);
    if (this.birthdayScans.get(branch.id) === today) return;

    const patients = await this.repository.findBirthdayCandidates(branch.id);

    await Promise.all(
      patients.map(async (patient) => {
        if (
          !patient.birthDate ||
          patient.birthDate.getUTCMonth() !== localNow.getUTCMonth() ||
          patient.birthDate.getUTCDate() !== localNow.getUTCDate() ||
          !patient.phoneNumber
        ) {
          return;
        }
        const recipient = toE164(patient.phoneNumber);
        if (!recipient) return;

        const dedupeKey = `birthday:${patient.id}:${localNow.getUTCFullYear()}`;
        await this.repository.enqueueNotification({
          dedupeKey,
          recipient,
          eventType: BIRTHDAY_EVENT,
          payload: { patientId: patient.id },
          nextAttemptAt: now,
        });
      }),
    );
    this.birthdayScans.set(branch.id, today);
  }

  private async deliverNotification(notification: PatientSmsNotification) {
    try {
      const payload = this.jsonObject(notification.payload);
      const recipient: { phone: string; body?: string } | null =
        notification.eventType === APPOINTMENT_REMINDER_EVENT
          ? await this.appointmentReminderRecipient(payload)
          : await this.birthdayRecipient(payload);

      if (!recipient) {
        await this.markSent(notification.id);
        return;
      }

      const body =
        notification.eventType === APPOINTMENT_REMINDER_EVENT
          ? this.appointmentReminderBody(payload)
          : (recipient.body ?? '');
      const result = await this.delivery.sendSmsBatch([recipient.phone], body);
      if (result[0] !== true) throw new Error('SMS delivery failed');
      await this.markSent(notification.id);
    } catch (error) {
      const attempts = notification.attempts + 1;
      const delayMinutes = Math.min(1440, 2 ** Math.min(attempts, 10));
      await this.repository.scheduleNotificationRetry(
        notification.id,
        attempts,
        new Date(Date.now() + delayMinutes * 60_000),
      );
      this.logger.error(
        `Could not deliver patient SMS notification ${notification.id}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private async appointmentReminderRecipient(payload: Record<string, unknown>) {
    const appointmentId = this.jsonString(payload.appointmentId);
    const scheduledAt = this.jsonString(payload.scheduledAt);
    if (!appointmentId || !scheduledAt) return null;

    const appointment =
      await this.repository.findReminderAppointment(appointmentId);
    if (
      !appointment ||
      appointment.deletedAt ||
      !['PENDING', 'CONFIRMED'].includes(appointment.status) ||
      !appointment.patient.isActive ||
      appointment.patient.deletedAt ||
      this.appointmentDateTime(
        appointment.date,
        appointment.time,
      ).toISOString() !== scheduledAt ||
      this.appointmentDateTime(appointment.date, appointment.time) <=
        clinicNow(appointment.doctor.branch.timezone)
    ) {
      return null;
    }

    const phone = appointment.patient.phoneNumber
      ? toE164(appointment.patient.phoneNumber)
      : null;
    return phone ? { phone } : null;
  }

  private async birthdayRecipient(payload: Record<string, unknown>) {
    const patientId = this.jsonString(payload.patientId);
    if (!patientId) return null;

    const patient = await this.repository.findBirthdayPatient(patientId);
    if (
      !patient ||
      !patient.isActive ||
      patient.deletedAt ||
      !patient.marketingSmsConsent ||
      patient.Role?.slug !== 'patient' ||
      !patient.birthDate ||
      !patient.phoneNumber
    ) {
      return null;
    }

    const localNow = clinicNow(patient.branch.timezone);
    if (
      patient.birthDate.getUTCMonth() !== localNow.getUTCMonth() ||
      patient.birthDate.getUTCDate() !== localNow.getUTCDate()
    ) {
      return null;
    }
    const phone = toE164(patient.phoneNumber);
    return phone
      ? {
          phone,
          body: `Feliz aniversário, ${patient.firstName}! A equipa da sua clínica deseja-lhe um dia muito feliz.`,
        }
      : null;
  }

  private appointmentReminderBody(payload: Record<string, unknown>) {
    const scheduledAt = this.jsonString(payload.scheduledAt);
    const date = new Date(scheduledAt);
    const dateText = new Intl.DateTimeFormat('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(date);
    const timeText = new Intl.DateTimeFormat('pt-PT', {
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
      timeZone: 'UTC',
    }).format(date);
    return `Lembrete: tem uma consulta marcada para ${dateText} às ${timeText}. Em caso de necessidade, contacte a sua clínica.`;
  }

  private async markSent(id: string) {
    await this.repository.markNotificationSent(id, new Date());
  }

  private appointmentDateTime(date: Date, time: Date) {
    return new Date(
      Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate(),
        time.getUTCHours(),
        time.getUTCMinutes(),
        time.getUTCSeconds(),
      ),
    );
  }

  private startOfDay(date: Date) {
    return new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    );
  }

  private dateKey(date: Date) {
    return `${date.getUTCFullYear()}-${date.getUTCMonth() + 1}-${date.getUTCDate()}`;
  }

  private jsonObject(value: unknown): Record<string, unknown> {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return {};
    }
    return value as Record<string, unknown>;
  }

  private jsonString(value: unknown) {
    return typeof value === 'string' ? value : '';
  }
}
