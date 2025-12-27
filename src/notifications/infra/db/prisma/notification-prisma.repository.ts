import { NotificationStatus, TypeNotification, notification_logs as Log } from "@prisma/client";
import { PrismaService } from "../../../../shared/infra/db/prisma/prisma.service";
import {
  INotificationRepository,
  Notification,
  NotificationId,
  NotificationSearchParams,
  NotificationSearchResult,
} from "../../../domain";
import { NotificationModelMapper } from "./notification-model.mapper";
import { NotFoundError } from "../../../../shared/domain/errors/not-found.error";
import { LogsModelMapper } from "../../../../logs/infra/db/prisma/logs.mapper";

export class NotificationPrismaRepository implements INotificationRepository {
  sortableFields: string[] = ["createdAt"];

  constructor(private _prismaService: PrismaService) {}
  findLogsByNotificationId(notificationId: string): Promise<Log | null> {
    return this._prismaService.notification_logs.findFirst({
      where: { notification_id: notificationId },
    })
  }
  async insertLog(props: any): Promise<void> {
    const log = LogsModelMapper.toPrisma(props);
    await this._prismaService.notification_logs.create({
      data: log,
    });
  }
  findApplicationByKey(key: string): Promise<any> {
    return this._prismaService.notification_applications.findFirst({
      where: { api_key: key },
    });
  }

  async findScheduledNotifications(now: Date): Promise<Notification[]> {
    const models = await this._prismaService.notification_notifications.findMany({
      where: {
        status: NotificationStatus.ScHEDULED,
        scheduled_at: {
          lte: now,
        },
      },
    });

    return models.map((model) => NotificationModelMapper.toEntity(model));
  }

  async updateStatus(
    notificationId: string,
    status: NotificationStatus
  ): Promise<void> {
    await this._prismaService.notification_notifications.update({
      where: { id: notificationId },
      data: { status },
    });
  }
  async findByApplicationId(applicationId: string): Promise<Notification[]> {
    return this._prismaService.notification_notifications
      .findMany({
        where: { application_id: applicationId },
      })
      .then((models) => {
        return models.map((model) => NotificationModelMapper.toEntity(model));
      });
  }
  async findByType(type: string): Promise<Notification[]> {
    return this._prismaService.notification_notifications
      .findMany({
        where: { type: type as TypeNotification },
      })
      .then((models) => {
        return models.map((model) => NotificationModelMapper.toEntity(model));
      });
  }
  async findByStatus(status: string): Promise<Notification[]> {
    return this._prismaService.notification_notifications
      .findMany({
        where: { status: status as NotificationStatus },
      })
      .then((models) => {
        return models.map((model) => NotificationModelMapper.toEntity(model));
      });
  }
  async findByScheduledAt(scheduledAt: Date): Promise<Notification[]> {
    return this._prismaService.notification_notifications
      .findMany({
        where: { scheduled_at: scheduledAt },
      })
      .then((models) => {
        return models.map((model) => NotificationModelMapper.toEntity(model));
      });
  }
  async findBySentAt(sentAt: Date): Promise<Notification[]> {
    return this._prismaService.notification_notifications
      .findMany({
        where: { sendt_at: sentAt },
      })
      .then((models) => {
        return models.map((model) => NotificationModelMapper.toEntity(model));
      });
  }
  findByReScheduledAt(reScheduledAt: Date): Promise<Notification[]> {
    throw new Error("Method not implemented.");
  }
  async findByReceipts(receipts: string[]): Promise<Notification[]> {
    return this._prismaService.notification_notifications
      .findMany({
        where: { receipts: { hasEvery: receipts } },
      })
      .then((models) => {
        return models.map((model) => NotificationModelMapper.toEntity(model));
      });
  }
  async findByTitle(title: string): Promise<Notification[]> {
    return this._prismaService.notification_notifications
      .findMany({
        where: { title },
      })
      .then((models) => {
        return models.map((model) => NotificationModelMapper.toEntity(model));
      });
  }
  async findByBody(body: string): Promise<Notification[]> {
    return this._prismaService.notification_notifications
      .findMany({
        where: { body },
      })
      .then((models) => {
        return models.map((model) => NotificationModelMapper.toEntity(model));
      });
  }
  async search(
    props: NotificationSearchParams
  ): Promise<NotificationSearchResult> {
    const offset = (props.page - 1) * props.perPage;
    const limit = props.perPage;

    const validSortFields = [
      "id",
      "type",
      "title",
      "status",
      "scheduled_at",
      "re_scheduled_at",
      "created_at",
      "updated_at",
    ];

    const shouldOrder =
      props.sort && validSortFields.includes(props.sort) && props.sortDir;

    const [data, total] = await this._prismaService.$transaction([
      this._prismaService.notification_notifications.findMany({
        ...(shouldOrder && {
          orderBy: {
            [props.sort]: props.sortDir as "asc" | "desc",
          },
        }),
        skip: offset,
        take: limit,
      }),
      this._prismaService.notification_notifications.count(),
    ]);

    return new NotificationSearchResult({
      data,
      currentPage: props.page,
      perPage: props.perPage,
      total,
    });
  }

  async insert(entity: Notification): Promise<void> {
    const modelProps = NotificationModelMapper.toModel(entity);

    await this._prismaService.notification_notifications.create({
      data: {
        ...modelProps,
        scheduled_at: modelProps.scheduled_at
          ? new Date(modelProps.scheduled_at)
          : null,
      },
    });
  }

  async bulkInsert(entities: Notification[]): Promise<void> {
    const modelProps = entities.map((enntity) =>
      NotificationModelMapper.toModel(enntity)
    );
    await this._prismaService.notification_notifications.createMany({
      data: modelProps,
    });
  }
  async findById(entityId: NotificationId): Promise<Notification> {
    const model = await this._prismaService.notification_notifications.findUnique({
      where: { id: entityId.toString() },
    });

    if (!model) {
      throw new NotFoundError(entityId, Notification);
    }

    return NotificationModelMapper.toEntity(model);
  }
  async findByIds(ids: NotificationId[]): Promise<Notification[]> {
    const models = await this._prismaService.notification_notifications.findMany({
      where: {
        id: {
          in: ids.map((id) => id.value),
        },
      },
    });

    return models.map((model) => {
      return NotificationModelMapper.toEntity(model);
    });
  }
  async findAll(): Promise<Notification[]> {
    const models = await this._prismaService.notification_notifications.findMany({});
    return models.map((model) => {
      return NotificationModelMapper.toEntity(model);
    });
  }
  async update(entity: Notification): Promise<void> {
    const modelProps = NotificationModelMapper.toModel(entity);

    const model = await this._prismaService.notification_notifications.update({
      where: { id: entity.id.value },
      data: modelProps,
    });
    if (!model) {
      throw new NotFoundError(entity.id, Notification);
    }
  }
  async delete(entityId: NotificationId): Promise<void> {
    await this._prismaService.notification_notifications.delete({
      where: { id: entityId.toString() },
    });
  }
  getEntity(): new (...args: any[]) => Notification {
    return Notification;
  }
}
