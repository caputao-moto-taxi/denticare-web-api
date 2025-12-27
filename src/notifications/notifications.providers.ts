import { PrismaService } from "../shared/infra/db/prisma/prisma.service";
import { ScheduledNotificationsService } from "./app/queue/notificationQueue";
import {
  CreateNotificationUseCase,
  DeleteNotificationUseCase,
  GetNotificationUseCase,
  ListNotificationsUseCase,
  UpdateNotificationUseCase,
} from "./app/useCases";
import { INotificationRepository } from "./domain";
import { NotificationPrismaRepository } from "./infra/db/prisma/notification-prisma.repository";

export const REPOSITORIES = {
  NOTIFICATION_REPOSITORY: {
    provide: "NotificationRepository",
    useExisting: NotificationPrismaRepository,
  },
  NOTIFICATION_PRISMA_REPOSITORY: {
    provide: NotificationPrismaRepository,
    useFactory: (prismaService: PrismaService) => {
      return new NotificationPrismaRepository(prismaService);
    },
    inject: [PrismaService],
  },
};

export const USE_CASES = {
  CREATE_NOTIFICATION_USE_CASE: {
    provide: CreateNotificationUseCase,
    useFactory: (
      notificationRepository: INotificationRepository,
    ) => {
      return new CreateNotificationUseCase(
        notificationRepository);
    },
    inject: [
      REPOSITORIES.NOTIFICATION_REPOSITORY.provide,
    ],
  },
  GET_NOTIFICATION_USE_CASE: {
    provide: GetNotificationUseCase,
    useFactory: (notificationRepository: INotificationRepository) => {
      return new GetNotificationUseCase(notificationRepository);
    },
    inject: [REPOSITORIES.NOTIFICATION_REPOSITORY.provide],
  },
  LIST_NOTIFICATION_USE_CASE: {
    provide: ListNotificationsUseCase,
    useFactory: (notificationRepository: INotificationRepository) => {
      return new ListNotificationsUseCase(notificationRepository);
    },
    inject: [REPOSITORIES.NOTIFICATION_REPOSITORY.provide],
  },
  DELETE_NOTIFICATION_USE_CASE: {
    provide: DeleteNotificationUseCase,
    useFactory: (notificationRepository: INotificationRepository) => {
      return new DeleteNotificationUseCase(notificationRepository);
    },
    inject: [REPOSITORIES.NOTIFICATION_REPOSITORY.provide],
  },
  UPDATE_NOTIFICATION_USE_CASE: {
    provide: UpdateNotificationUseCase,
    useFactory: (notificationRepository: INotificationRepository) => {
      return new UpdateNotificationUseCase(notificationRepository);
    },
    inject: [REPOSITORIES.NOTIFICATION_REPOSITORY.provide],
  },
  NOTIFICATION_QUEUE_SERVICE: {
    provide: ScheduledNotificationsService,
    useFactory: (notificationRepository: INotificationRepository) => {
      return new UpdateNotificationUseCase(notificationRepository);
    },
    inject: [REPOSITORIES.NOTIFICATION_REPOSITORY.provide],
  }
};

export const NOTIFICATION_PROVIDERS = {
  REPOSITORIES,
  USE_CASES,
};
