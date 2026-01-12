import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { applyGlobalConfig } from './global-config';
import { Logger, LogLevel } from '@nestjs/common';
import { json as expressJson, urlencoded as expressUrlEncoded } from 'express';
import {
  appDocPath,
  appPort,
  appSystemTag,
  appTitle,
  appVersion,
  corsOptions,
  loggerLevels,
} from './shared/helpers/basicConfigsConstants';
import { SwaggerModule } from '@nestjs/swagger';
import {
  openApiDocumentBuilder,
  openApiDocumentOptionsBase,
  openApiOptionsBase,
} from './shared/helpers/swaggerBasicConfig';
import * as requestIp from 'request-ip';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: loggerLevels,
  });

  applyGlobalConfig(app);
  const logger = new Logger(appSystemTag);

  app.use(requestIp.mw());
  app.use(expressJson({ limit: '5mb' }));
  app.use(expressUrlEncoded({ limit: '5mb', extended: true }));
  app.enableCors(corsOptions);

  SwaggerModule.setup(
    appDocPath,
    app,
    SwaggerModule.createDocument(
      app,
      openApiDocumentBuilder().build(),
      openApiDocumentOptionsBase,
    ),
    openApiOptionsBase,
  );

  await app.listen(appPort());

  logger.log(`${appTitle} Version: ${appVersion}`);
  logger.log(`Started in http://localhost:${appPort()}`);
  logger.log(`API Documented in http://localhost:${appPort()}${appDocPath}`);

  await app.startAllMicroservices();
}
bootstrap();
