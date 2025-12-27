import { notification_notifications as NotificationPrisma,  NotificationStatus,  TypeNotification } from '@prisma/client';
import { NotificationId, Notification } from '../../../domain/notifications.aggregate';


export class NotificationModelMapper {
  static toModel(notification: Notification): NotificationPrisma {
    return {
      id: notification.id.value,
      type: notification.type as TypeNotification,
      receipts: notification.receipts,
      title: notification.title,
      body: notification.body,
      scheduled_at: notification.scheduledAt,
      sendt_at: notification.sentAt,
      application_id: notification.applicationId,
      re_scheduled_at: notification.reScheduledAt,
      status: notification.status as NotificationStatus,
      created_at: notification.createdAt,
      updated_at: notification.updatedAt,
    };
  }

  static toEntity(model: NotificationPrisma): Notification {
    return new Notification({
      id: new NotificationId(model.id),
      type: model.type,
      receipts: model.receipts,
      title: model.title,
      body: model.body,
      scheduledAt: model.scheduled_at,
      sentAt: model.sendt_at,
      applicationId: model.application_id,
      reScheduledAt: model.re_scheduled_at,
      status: model.status,
      createdAt: new Date(model.created_at),
      updatedAt: new Date(model.updated_at),
    });
  }
}
