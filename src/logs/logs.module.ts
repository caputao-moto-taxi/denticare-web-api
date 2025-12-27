import { Module } from "@nestjs/common";
import { LOGS_PROVIDERS } from "./logs.providers";
import { LogsController } from "./infra/http/controllers/logsControllers";

@Module({
  imports: [],
  controllers: [LogsController],
  providers: [
    ...Object.values(LOGS_PROVIDERS.REPOSITORIES),
    ...Object.values(LOGS_PROVIDERS.USE_CASES),
  ],
  exports: [LOGS_PROVIDERS.REPOSITORIES.LOGS_REPOSITORY.provide],
})
export class LogsModule {}
