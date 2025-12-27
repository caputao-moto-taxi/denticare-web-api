import { IUseCase } from "../../../../shared/application/use-case.interface";
import { badRequestResponse, errorResponse, successResponse, HttpResponse } from "../../../../shared/contracts/httpContracts";
import { ErrorMessages } from "../../../../shared/helpers/errorMessages";
import { ILogsRepository } from "../../../domain";
import { LogsOutputMapper, CreateLogOutput } from "../../common/logs.output";

export type FilterLogsByApplicationIdAndTimestampInput = {
  applicationId: string;
  timestamp?: Date;
};

export class FilterLogsByApplicationIdAndTimestampUseCase
  implements
    IUseCase<
      FilterLogsByApplicationIdAndTimestampInput,
      FilterLogsByApplicationIdAndTimestampOutput
    >
{
  constructor(
    private readonly logsRepository: ILogsRepository
  ) {}
  async execute(
    input: FilterLogsByApplicationIdAndTimestampInput
  ): Promise<HttpResponse<FilterLogsByApplicationIdAndTimestampOutput[] | any>> {
    try {
      const { applicationId, timestamp } = input;

      const logs = await this.logsRepository.logsByApplicationIdAndTimestamp(
        applicationId,
        timestamp
      );

      if (!logs) {
        return badRequestResponse({ message: ErrorMessages.LOGS_NOT_FOUND });
      }

      return successResponse(logs.map((log) => LogsOutputMapper.toOutput(log)));

    }catch(error: any) {
      return errorResponse(error);
    }
  }
}

export type FilterLogsByApplicationIdAndTimestampOutput = CreateLogOutput;
