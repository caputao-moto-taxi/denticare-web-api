import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../../generated/prisma/client';
import { PrismaService } from '../../../../shared/infra/db/prisma/prisma.service';
import {
  BirthdayCandidate,
  BirthdayPatientRecord,
  PatientSmsJobsRepository,
  PatientSmsNotification,
  ReminderAppointmentCandidate,
  ReminderAppointmentRecord,
} from '../../../application/patient-sms-jobs.repository';

@Injectable()
export class PatientSmsJobsPrismaRepository extends PatientSmsJobsRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  listActiveBranches() {
    return this.prisma.branch.findMany({
      where: { isActive: true, deletedAt: null },
      select: { id: true, timezone: true },
    });
  }

  findReminderAppointments(
    branchId: string,
    dayFrom: Date,
    dayTo: Date,
  ): Promise<ReminderAppointmentCandidate[]> {
    return this.prisma.appointment.findMany({
      where: {
        deletedAt: null,
        status: { in: ['PENDING', 'CONFIRMED'] },
        doctor: { branchId },
        patient: { deletedAt: null, isActive: true },
        date: { gte: dayFrom, lte: dayTo },
      },
      select: {
        id: true,
        date: true,
        time: true,
        patient: { select: { phoneNumber: true } },
      },
    });
  }

  findBirthdayCandidates(branchId: string): Promise<BirthdayCandidate[]> {
    return this.prisma.person.findMany({
      where: {
        branchId,
        isActive: true,
        deletedAt: null,
        birthDate: { not: null },
        phoneNumber: { not: null },
        marketingSmsConsent: true,
        Role: { slug: 'patient' },
      },
      select: {
        id: true,
        firstName: true,
        birthDate: true,
        phoneNumber: true,
      },
    });
  }

  async enqueueNotification(input: {
    dedupeKey: string;
    recipient: string;
    eventType: string;
    payload: Record<string, string>;
    nextAttemptAt: Date;
  }) {
    await this.prisma.notificationOutbox.upsert({
      where: { dedupeKey: input.dedupeKey },
      create: input,
      update: {},
    });
  }

  claimNotifications(
    eventTypes: string[],
    staleLock: Date,
    limit: number,
  ): Promise<PatientSmsNotification[]> {
    return this.prisma.$transaction(async (transaction) => {
      const due = await transaction.$queryRaw<Array<{ id: string }>>(
        Prisma.sql`
          SELECT "id"
          FROM "notification_outbox"
          WHERE "eventType" IN (${Prisma.join(eventTypes)})
            AND "sentAt" IS NULL
            AND "nextAttemptAt" <= NOW()
            AND ("lockedAt" IS NULL OR "lockedAt" < ${staleLock})
          ORDER BY "createdAt"
          FOR UPDATE SKIP LOCKED
          LIMIT ${limit}
        `,
      );
      if (!due.length) return [];

      const ids = due.map(({ id }) => id);
      await transaction.notificationOutbox.updateMany({
        where: { id: { in: ids } },
        data: { lockedAt: new Date() },
      });
      return transaction.notificationOutbox.findMany({
        where: { id: { in: ids } },
      });
    });
  }

  findReminderAppointment(
    appointmentId: string,
  ): Promise<ReminderAppointmentRecord | null> {
    return this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: {
        date: true,
        time: true,
        status: true,
        deletedAt: true,
        patient: {
          select: { phoneNumber: true, isActive: true, deletedAt: true },
        },
        doctor: { select: { branch: { select: { timezone: true } } } },
      },
    });
  }

  findBirthdayPatient(
    patientId: string,
  ): Promise<BirthdayPatientRecord | null> {
    return this.prisma.person.findUnique({
      where: { id: patientId },
      select: {
        firstName: true,
        birthDate: true,
        phoneNumber: true,
        marketingSmsConsent: true,
        isActive: true,
        deletedAt: true,
        Role: { select: { slug: true } },
        branch: { select: { timezone: true } },
      },
    });
  }

  async markNotificationSent(id: string, sentAt: Date) {
    await this.prisma.notificationOutbox.update({
      where: { id },
      data: { sentAt, lockedAt: null },
    });
  }

  async scheduleNotificationRetry(
    id: string,
    attempts: number,
    nextAttemptAt: Date,
  ) {
    await this.prisma.notificationOutbox.update({
      where: { id },
      data: { attempts, nextAttemptAt, lockedAt: null },
    });
  }
}
