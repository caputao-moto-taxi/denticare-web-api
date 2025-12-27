import { IUseCase } from "../../../../shared/application/use-case.interface";
import {
  badRequestResponse,
  errorResponse,
  successResponse,
  HttpResponse,
} from "../../../../shared/contracts/httpContracts";
import { ErrorMessages } from "../../../../shared/helpers/errorMessages";
import { ILogsRepository } from "../../../domain";
import { LogsOutputMapper, CreateLogOutput } from "../../common/logs.output";

export class AllLogsUseCase implements IUseCase<any, AllLogsOutput> {
  constructor(private readonly logsRepository: ILogsRepository) {}
  async execute(): Promise<HttpResponse<AllLogsOutput[] | any>> {
    try {
      const logs = await this.logsRepository.findAll();

      if (logs.length === 0) {
        return badRequestResponse({ message: ErrorMessages.LOGS_NOT_FOUND });
      }
      return successResponse(logs.map((log) => LogsOutputMapper.toOutput(log)));
    } catch (error: any) {
      return errorResponse(error);
    }
  }
}

export type AllLogsOutput = CreateLogOutput;
