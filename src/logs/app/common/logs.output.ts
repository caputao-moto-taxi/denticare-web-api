import { Logs } from "../../domain/log.aggregate";

export type CreateLogOutput = {
  id: string;
  error: string;
  message: string;
  type: string;
  statusCode: number;
  retryCount: number;
  notificationId: string;
  createdAt: Date;
  updatedAt: Date;
}

export class LogsOutputMapper {
  static toOutput(entity: Logs): CreateLogOutput {
    return entity.toJSON();
  }
}