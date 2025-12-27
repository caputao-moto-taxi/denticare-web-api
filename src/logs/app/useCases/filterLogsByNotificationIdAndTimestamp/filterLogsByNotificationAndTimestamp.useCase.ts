import { IUseCase } from "../../../../shared/application/use-case.interface";
import {
  badRequestResponse,
  errorResponse,
  successResponse,
  type HttpResponse,
} from "../../../../shared/contracts/httpContracts";
import { ErrorMessages } from "../../../../shared/helpers/errorMessages";
import { ILogsRepository } from "../../../domain";
import {
  LogsOutputMapper,
  type CreateLogOutput,
} from "../../common/logs.output";

export type GetLogsByNotificationIdAndTimestampInput = {
  notificationId: string;
  timestamp?: Date;
};

export class FilterLogsByNotificationIdAndTimestampUseCase
  implements
    IUseCase<
      GetLogsByNotificationIdAndTimestampInput,
      GetLogsByNotificationIdAndTimestampResponse
    >
{
  constructor(private readonly logsRepository: ILogsRepository) {}

  async execute(
    input: GetLogsByNotificationIdAndTimestampInput
  ): Promise<HttpResponse<GetLogsByNotificationIdAndTimestampResponse | any>> {
    try {
      const { notificationId, timestamp } = input;
      const logs = await this.logsRepository.filterByNotificationIdAndTimestamp(
        notificationId,
        timestamp
      );

      if (!logs) {
        return badRequestResponse({ message: ErrorMessages.LOGS_NOT_FOUND });
      }

      return successResponse(logs.map((log) => LogsOutputMapper.toOutput(log)));
    } catch (error: any) {
      return errorResponse(error);
    }
  }
}

export type GetLogsByNotificationIdAndTimestampResponse = CreateLogOutput;
