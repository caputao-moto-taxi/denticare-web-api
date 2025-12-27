import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Res,
  Headers,
} from "@nestjs/common";

import { ApiHeader, ApiTags } from "@nestjs/swagger";
import {
  CreateNotificationUseCase,
  UpdateNotificationUseCase,
  DeleteNotificationUseCase,
  GetNotificationUseCase,
  ListNotificationsUseCase,
  UpdateNotificationInput,
} from "../../../app/useCases";
import { Response } from "express";
import { CreateNotificationDto } from "./dtos/notificationsDto";
import { ApiKeyAuth } from "../../../../shared/guards/api-key.decorator";
import { readFileSync } from "fs";
import { join } from "path";

@ApiTags("[NOTIFICATIONS] Module to send and create notifications.")
@Controller("notification")
export class NotificationController {
  constructor(
    private readonly createNotificationUseCase: CreateNotificationUseCase,
    private readonly updateNotificationUseCase: UpdateNotificationUseCase,
    private readonly deleteNotificationUseCase: DeleteNotificationUseCase,
    private readonly findNotificationByIdUseCase: GetNotificationUseCase,
    private readonly findAllNotificationUseCase: ListNotificationsUseCase
  ) {}

  @ApiKeyAuth()
  @Post()
  @ApiHeader({
    name: 'x-api-key',
    description: 'API Key for authenticating requests',
    required: true,
  })
  async create(
    @Body() input: CreateNotificationDto,
    @Headers("x-api-key") apiKey: string,
    @Res() res: Response
  ) {
    const props = {
      ...input,
      apiKey,
    };
    const index = await this.createNotificationUseCase.execute(props);
    return res.status(index.status).json(index.data);
  }

  @Get()
  async findAll(
    @Query("page") page = 1,
    @Query("perPage") perPage = 10,
    @Res() res: Response
  ) {
    const index = await this.findAllNotificationUseCase.execute({
      page,
      perPage,
    });

    return res.status(index.status).json(index.data);
  }

  @Get("test-view")
  async testView(@Res() res: Response) {
    const htmlPath = join(process.cwd(), "teste.html");
    const html = readFileSync(htmlPath, "utf8");
    res.setHeader("Content-Type", "text/html");
    return res.send(html);
  }

  @Get(":id")
  async findOne(@Param("id") id: string, @Res() res: Response) {
    const index = await this.findNotificationByIdUseCase.execute({ id });
    return res.status(index.status).json(index.data);
  }

  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body() input: Partial<UpdateNotificationInput>,
    @Res() res: Response
  ) {
    const index = await this.updateNotificationUseCase.execute({
      id,
      ...input,
    });
    return res.status(index.status).json(index.data);
  }

  @Delete(":id")
  async delete(@Param("id") id: string, @Res() res: Response) {
    await this.deleteNotificationUseCase.execute({ id });
    return res.json({
      message: `Notification with ID ${id} has been deleted.`,
    });
  }
}
