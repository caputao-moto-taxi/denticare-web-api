import { PrismaService } from "../shared/infra/db/prisma/prisma.service";
import {
  AllLogsUseCase,
  FilterLogsByApplicationIdAndTimestampUseCase,
  FilterLogsByNotificationIdAndTimestampUseCase,
} from "./app/useCases";
import { ILogsRepository } from "./domain";
import { LogsPrismaRepository } from "./infra/db/prisma/logsPrisma.repository";

export const REPOSITORIES = {
  LOGS_REPOSITORY: {
    provide: "LogsRepository",
    useExisting: LogsPrismaRepository,
  },
  LOGS_PRISMA_REPOSITORY: {
    provide: LogsPrismaRepository,
    useFactory: (prismaService: PrismaService) => {
      return new LogsPrismaRepository(prismaService);
    },
    inject: [PrismaService],
  },
};

export const USE_CASES = {
  ALL_LOGS_USE_CASE: {
    provide: AllLogsUseCase,
    useFactory: (logsRepository: ILogsRepository) => {
      return new AllLogsUseCase(logsRepository);
    },
    inject: [REPOSITORIES.LOGS_REPOSITORY.provide],
  },
  FILTER_LOGS_BY_APPLICATION_AND_TIMESTAMP_USE_CASE: {
    provide: FilterLogsByApplicationIdAndTimestampUseCase,
    useFactory: (logsRepository: ILogsRepository) => {
      return new FilterLogsByApplicationIdAndTimestampUseCase(logsRepository);
    },
    inject: [REPOSITORIES.LOGS_REPOSITORY.provide],
  },
  FILTER_LOGS_BY_NOTIFICATION_AND_TIMESTAMP_USE_CASE: {
    provide: FilterLogsByNotificationIdAndTimestampUseCase,
    useFactory: (logsRepository: ILogsRepository) => {
      return new FilterLogsByNotificationIdAndTimestampUseCase(logsRepository);
    },
    inject: [REPOSITORIES.LOGS_REPOSITORY.provide],
  },
};

export const LOGS_PROVIDERS = {
  REPOSITORIES,
  USE_CASES,
};
