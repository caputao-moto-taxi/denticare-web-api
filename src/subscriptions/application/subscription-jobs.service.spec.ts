import { PrismaService } from '../../shared/infra/db/prisma/prisma.service';
import type { SendMailServiceUseCase } from '../../shared/infra/services/sendEmailNotification.service';
import { SubscriptionJobsService } from './subscription-jobs.service';

describe('SubscriptionJobsService email delivery', () => {
  it('renders subscription notifications using the branded HTML template', async () => {
    const notification = {
      id: 'notification-id',
      recipient: 'billing@example.test',
      eventType: 'SUBSCRIPTION_APPROVED',
      payload: {
        requestId: 'request-123',
        planName: 'Clinic plan',
        expiresAt: '2026-12-01',
      },
      attempts: 0,
    };
    const transaction = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: notification.id }]),
      notificationOutbox: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findMany: jest.fn().mockResolvedValue([notification]),
      },
    };
    const prismaMock = {
      $transaction: jest.fn((operation) => operation(transaction)),
      notificationOutbox: {
        update: jest.fn().mockResolvedValue({}),
      },
    };
    const sendMailServiceMock = {
      execute: jest.fn().mockResolvedValue(true),
    };
    const service = new SubscriptionJobsService(
      prismaMock as unknown as PrismaService,
      sendMailServiceMock as unknown as SendMailServiceUseCase,
    );

    await service.deliverNotifications();

    expect(sendMailServiceMock.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'billing@example.test',
        subject: 'A sua subscrição DentCare foi aprovada',
        text: expect.stringContaining('request-123'),
        html: expect.stringContaining('request-123'),
      }),
    );
    expect(prismaMock.notificationOutbox.update).toHaveBeenCalledWith({
      where: { id: notification.id },
      data: { sentAt: expect.any(Date), lockedAt: null },
    });
  });
});
