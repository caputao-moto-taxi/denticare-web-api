import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Prisma } from '../../../generated/prisma/client';
import { AuthEmailService } from '../../auth/domain/auth-email.service';
import { PrismaService } from '../../shared/infra/db/prisma/prisma.service';

@Injectable()
export class SubscriptionJobsService {
  private readonly logger = new Logger(SubscriptionJobsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: AuthEmailService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async updateExpiredSubscriptions() {
    const now = new Date();
    const trialExpiry = await this.prisma.clinicSubscription.updateMany({
      where: {
        status: 'TRIAL_ACTIVE',
        expiresAt: { lte: now },
      },
      data: { status: 'TRIAL_EXPIRED', endedAt: now },
    });
    const paidExpiry = await this.prisma.clinicSubscription.updateMany({
      where: {
        status: { in: ['ACTIVE', 'EXPIRING_SOON'] },
        expiresAt: { lte: now },
      },
      data: { status: 'EXPIRED', endedAt: now },
    });
    if (trialExpiry.count + paidExpiry.count) {
      this.logger.log(
        `Expired ${trialExpiry.count} trials and ${paidExpiry.count} subscriptions`,
      );
    }

    const reminderEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const expiring = await this.prisma.clinicSubscription.findMany({
      where: {
        status: { in: ['TRIAL_ACTIVE', 'ACTIVE', 'EXPIRING_SOON'] },
        expiresAt: { gt: now, lte: reminderEnd },
      },
      select: {
        id: true,
        status: true,
        expiresAt: true,
        headquarter: {
          select: {
            email: true,
            Branch: {
              where: { deletedAt: null },
              take: 1,
              select: {
                User: {
                  where: { isActive: true, deletedAt: null },
                  take: 1,
                  select: { email: true },
                },
              },
            },
          },
        },
      },
    });

    await Promise.all(
      expiring.map((subscription) => this.queueExpiryReminder(subscription)),
    );
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async deliverNotifications() {
    const notifications = await this.claimNotifications();
    await Promise.all(
      notifications.map((notification) =>
        this.deliverNotification(notification),
      ),
    );
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async removeExpiredAssistantHistory() {
    const deleted = await this.prisma.assistantConversation.deleteMany({
      where: { expiresAt: { lte: new Date() } },
    });
    if (deleted.count) {
      this.logger.log(
        `Removed ${deleted.count} expired assistant conversations`,
      );
    }
  }

  private async claimNotifications() {
    return this.prisma.$transaction(async (transaction) => {
      const staleLock = new Date(Date.now() - 10 * 60_000);
      const due = await transaction.$queryRaw<Array<{ id: string }>>(
        Prisma.sql`
          SELECT "id"
          FROM "notification_outbox"
          WHERE "sentAt" IS NULL
            AND "nextAttemptAt" <= NOW()
            AND ("lockedAt" IS NULL OR "lockedAt" < ${staleLock})
          ORDER BY "createdAt"
          FOR UPDATE SKIP LOCKED
          LIMIT 20
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

  private async queueExpiryReminder(subscription: {
    id: string;
    status: string;
    expiresAt: Date;
    headquarter: {
      email: string | null;
      Branch: Array<{ User: Array<{ email: string }> }>;
    };
  }) {
    const recipient =
      subscription.headquarter.email ??
      subscription.headquarter.Branch[0]?.User[0]?.email;
    if (!recipient) {
      this.logger.warn(
        `No notification recipient is configured for subscription ${subscription.id}`,
      );
      return;
    }
    const reminderKey = `subscription:${subscription.id}:expiry-reminder`;
    await this.prisma.notificationOutbox.upsert({
      where: { dedupeKey: reminderKey },
      create: {
        dedupeKey: reminderKey,
        recipient,
        eventType: 'SUBSCRIPTION_EXPIRING',
        payload: {
          expiresAt: subscription.expiresAt.toISOString(),
          isTrial: subscription.status === 'TRIAL_ACTIVE',
        },
      },
      update: {},
    });
    if (subscription.status === 'ACTIVE') {
      await this.prisma.clinicSubscription.update({
        where: { id: subscription.id },
        data: { status: 'EXPIRING_SOON' },
      });
    }
  }

  private async deliverNotification(
    notification: Awaited<
      ReturnType<SubscriptionJobsService['claimNotifications']>
    >[number],
  ) {
    try {
      const payload = this.jsonObject(notification.payload);
      await this.emailService.sendCampaignEmail(
        [notification.recipient],
        this.subject(notification.eventType),
        this.body(notification.eventType, payload),
      );
      await this.prisma.notificationOutbox.update({
        where: { id: notification.id },
        data: { sentAt: new Date(), lockedAt: null },
      });
    } catch (error) {
      const attempts = notification.attempts + 1;
      const delayMinutes = Math.min(1440, 2 ** Math.min(attempts, 10));
      await this.prisma.notificationOutbox.update({
        where: { id: notification.id },
        data: {
          attempts,
          nextAttemptAt: new Date(Date.now() + delayMinutes * 60_000),
          lockedAt: null,
        },
      });
      this.logger.error(
        `Could not deliver subscription notification ${notification.id}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private jsonObject(value: Prisma.JsonValue): Record<string, unknown> {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return {};
    }
    return value;
  }

  private subject(eventType: string) {
    switch (eventType) {
      case 'SUBSCRIPTION_APPROVED':
        return 'A sua subscrição DentCare foi aprovada';
      case 'SUBSCRIPTION_REJECTED':
        return 'Atualização do seu pedido de subscrição DentCare';
      case 'SUBSCRIPTION_INFORMATION_REQUESTED':
        return 'Informação adicional necessária para a subscrição DentCare';
      case 'SUBSCRIPTION_EXPIRING':
        return 'A sua subscrição DentCare está prestes a expirar';
      default:
        return 'Atualização da subscrição DentCare';
    }
  }

  private body(eventType: string, data: Record<string, unknown>) {
    if (eventType === 'SUBSCRIPTION_APPROVED') {
      return `O pedido ${this.jsonString(data.requestId)} foi aprovado. O plano ${this.jsonString(data.planName)} está ativo até ${this.jsonString(data.expiresAt)}.`;
    }
    if (eventType === 'SUBSCRIPTION_REJECTED') {
      return `O pedido ${this.jsonString(data.requestId)} foi rejeitado. Motivo: ${this.jsonString(data.reason)}. Pode submeter um novo comprovativo através do DentCare.`;
    }
    if (eventType === 'SUBSCRIPTION_INFORMATION_REQUESTED') {
      return `É necessária informação adicional para o pedido ${this.jsonString(data.requestId)}: ${this.jsonString(data.message)}.`;
    }
    if (eventType === 'SUBSCRIPTION_EXPIRING') {
      const trialText = data.isTrial
        ? 'O período de avaliação'
        : 'A subscrição';
      return `${trialText} termina em ${this.jsonString(data.expiresAt)}. Consulte a área de subscrições no DentCare para renovar o acesso.`;
    }
    return `Há uma atualização disponível na área de subscrições do DentCare.`;
  }

  private jsonString(value: unknown) {
    return typeof value === 'string' || typeof value === 'number'
      ? String(value)
      : '';
  }
}
