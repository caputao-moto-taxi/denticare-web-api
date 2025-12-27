import {
  BadRequestException,
  Controller,
  Get,
  Query,
  Res,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import {
  AllLogsUseCase,
  FilterLogsByApplicationIdAndTimestampUseCase,
  FilterLogsByNotificationIdAndTimestampUseCase,
  FilterLogsByApplicationIdAndTimestampInput,
  GetLogsByNotificationIdAndTimestampInput,
} from "../../../app/useCases";
import {
  FindLogsByApplicationAndTimestampDto,
  FindLogsByNotificationAndTimestampDto,
} from "./dtos/logsDtos";
import { Response } from "express";

@ApiTags("[LOGS] Module to see all notifications logs")
@Controller("logs")
export class LogsController {
  constructor(
    private readonly allLogsUseCase: AllLogsUseCase,
    private readonly filterLogsByApplicationIdAndTimestampUseCase: FilterLogsByApplicationIdAndTimestampUseCase,
    private readonly filterLogsByNotificationIdAndTimestampUseCase: FilterLogsByNotificationIdAndTimestampUseCase
  ) {}

  @Get()
  async findAll(@Res() res: Response) {
    const index = await this.allLogsUseCase.execute();
    return res.status(index.status).json(index.data);
  }

  @Get("filter-by-application")
  async filterByApplication(
    @Res() res: Response,
    @Query("applicationId")
    applicationId: FindLogsByApplicationAndTimestampDto["applicationId"],
    @Query("timestamp")
    timestamp?: FindLogsByApplicationAndTimestampDto["timestamp"]
  ) {
    let parsedTimestamp: Date | undefined = undefined;
    if (timestamp) {
      const date = new Date(timestamp);
      parsedTimestamp = date;
    }

    const input: FilterLogsByApplicationIdAndTimestampInput = {
      applicationId,
      timestamp: parsedTimestamp,
    };

    const index =
      await this.filterLogsByApplicationIdAndTimestampUseCase.execute(input);
    return res.status(index.status).json(index.data);
  }

  @Get("filter-by-notification")
  async filterByNotification(
    @Query("notificationId")
    notificationId: FindLogsByNotificationAndTimestampDto["notificationId"],
    @Query("timestamp")
    timestamp?: FindLogsByNotificationAndTimestampDto["timestamp"]
  ) {
    const parsedTimestamp = timestamp ? new Date(timestamp) : undefined;
    if (timestamp && isNaN(parsedTimestamp.getTime())) {
      throw new BadRequestException("timestamp inválido");
    }

    const input: GetLogsByNotificationIdAndTimestampInput = {
      notificationId,
      timestamp: parsedTimestamp,
    };

    const index =
      await this.filterLogsByNotificationIdAndTimestampUseCase.execute(input);
    return {
      status: index.status,
      data: index.data,
    };
  }
}
