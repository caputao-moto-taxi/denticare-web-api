import { SearchResult } from "../../../../shared/domain/repository/search-result";
import { PrismaService } from "../../../../shared/infra/db/prisma/prisma.service";
import { ILogsRepository, Logs, LogsId, LogsSearchParams } from "../../../domain";
import { LogsModelMapper } from "./logs.mapper";

export class LogsPrismaRepository implements ILogsRepository {
  constructor(private readonly _prismaService: PrismaService) {}
  async logsByApplicationIdAndTimestamp(applicationId: string, timestamp?: Date): Promise<Logs[] | null> {
    const response = await this._prismaService.notification_logs.findMany({
      where: {
        notification_notifications: {
          application_id: applicationId,
        },
        timestamp: {
          gte: timestamp ?? null,
        },
      },
    });

    return response ? response.map(log => LogsModelMapper.toDomain(log)) : null;
  }
  search(props: LogsSearchParams): Promise<SearchResult<any>> {
    throw new Error("Method not implemented.");
  }
  async filterByNotificationIdAndTimestamp(notificationId: string, timestamp?: Date): Promise<Logs[] | null> {
    const response = await this._prismaService.notification_logs.findMany({
      where: {
        notification_id: notificationId,
        timestamp: {
          gte: timestamp ?? null,
        },
      },
    });

    return response ? response.map(log => LogsModelMapper.toDomain(log)) : null;
  }
  sortableFields: string[];

  async insert(entity: Logs): Promise<void> {
    const log = LogsModelMapper.toPrisma(entity);
    await this._prismaService.notification_logs.create({
      data: log,
    });
  }
  bulkInsert(entities: Logs[]): Promise<void> {
    throw new Error("Method not implemented.");
  }
  async findById(entityId: LogsId): Promise<Logs> {
    const log = await this._prismaService.notification_logs.findUnique({ where : { id: entityId.value } });

    return log ? LogsModelMapper.toDomain(log) : null;
  }
  findByIds(ids: LogsId[]): Promise<Logs[]> {
    throw new Error("Method not implemented.");
  }
  async findAll(): Promise<Logs[]> {
    const logs = await this._prismaService.notification_logs.findMany();
    return logs.map(log => LogsModelMapper.toDomain(log));
  }
  update(entity: Logs): Promise<void> {
    throw new Error("Method not implemented.");
  }
  delete(entityId: LogsId): Promise<void> {
    throw new Error("Method not implemented.");
  }
  getEntity(): new (...args: any[]) => Logs {
    throw new Error("Method not implemented.");
  }
}