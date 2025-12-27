import { notification_logs as Log, TypeLog } from "@prisma/client";
import { Logs, LogsId } from "../../../domain";



export class LogsModelMapper {
  static toPrisma(log: Logs): Log {
    return {
      id: log.id.value,
      error: log.error,
      message: log.message,
      type: log.type as TypeLog,
      status_code: log.statusCode,
      timestamp: log.timestamp,
      retry_count: log.retryCount,
      notification_id: log.notificationId,
      created_at: log.createdAt,
      updated_at: log.updatedAt,
    };
  }

  static toDomain(log: Log): Logs {
    return new Logs({
      id: new LogsId(log.id),
      error: log.error,
      message: log.message,
      type: log.type,
      statusCode: log.status_code,
      timestamp: log.timestamp,
      retryCount: log.retry_count,
      notificationId: log.notification_id,
      createdAt: new Date(log.created_at),
      updatedAt: new Date(log.updated_at),
    })
  }
}