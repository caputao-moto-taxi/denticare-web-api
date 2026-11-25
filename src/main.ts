import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { applyGlobalConfig } from './global-config';
import { Logger } from '@nestjs/common';
import { json as expressJson, urlencoded as expressUrlEncoded } from 'express';
import helmet from 'helmet';
import basicAuth from 'express-basic-auth';
import { rateLimit } from 'express-rate-limit';
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

  const httpServer = app.getHttpServer();
  httpServer.headersTimeout = 15_000;
  httpServer.requestTimeout = 60_000;
  httpServer.keepAliveTimeout = 5_000;

  const expressApp = app.getHttpAdapter().getInstance();
  configureTrustProxy(expressApp);
  expressApp.disable('x-powered-by');

  const apiSecurityHeaders = helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        baseUri: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
  });
  const docsSecurityHeaders = helmet({ contentSecurityPolicy: false });
  app.use((req, res, next) => {
    const isDocsRequest =
      req.path === appDocPath ||
      req.path.startsWith(`${appDocPath}/`) ||
      req.path === `${appDocPath}-json`;
    return (isDocsRequest ? docsSecurityHeaders : apiSecurityHeaders)(
      req,
      res,
      next,
    );
  });

  applyGlobalConfig(app);
  const logger = new Logger(appSystemTag);

  app.use(requestIp.mw());
  app.use(expressJson({ limit: '5mb' }));
  app.use(
    expressUrlEncoded({
      limit: '100kb',
      extended: false,
      parameterLimit: 100,
    }),
  );
  app.enableCors(corsOptions());

  if (isSwaggerEnabled()) {
    if (process.env.NODE_ENV !== 'development') {
      const username = process.env.USER_DOCS;
      const password = process.env.PASS_DOCS;
      if (!username || !password || password.length < 16) {
        throw new Error(
          'Swagger requires USER_DOCS and a PASS_DOCS of at least 16 characters outside development',
        );
      }

      app.use(
        [appDocPath, `${appDocPath}-json`],
        rateLimit({
          windowMs: 15 * 60 * 1000,
          limit: 10,
          standardHeaders: true,
          legacyHeaders: false,
        }),
        basicAuth({
          challenge: true,
          realm: 'Dentcare API documentation',
          authorizer: (providedUsername, providedPassword) => {
            const usernameMatches = basicAuth.safeCompare(
              providedUsername,
              username,
            );
            const passwordMatches = basicAuth.safeCompare(
              providedPassword,
              password,
            );
            return usernameMatches && passwordMatches;
          },
        }),
      );
    }

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
  }

  await app.listen(appPort());

  logger.log(`${appTitle} Version: ${appVersion}`);
  logger.log(`Started in http://localhost:${appPort()}`);
  logger.log(`API Documented in http://localhost:${appPort()}${appDocPath}`);

  await app.startAllMicroservices();
}
bootstrap();

function isSwaggerEnabled() {
  if (process.env.SWAGGER_ENABLED === 'true') return true;
  return (
    process.env.NODE_ENV === 'development' &&
    process.env.SWAGGER_ENABLED !== 'false'
  );
}

function configureTrustProxy(expressApp: {
  set: (setting: string, value: number) => void;
}) {
  const configuredHops = process.env.TRUST_PROXY_HOPS ?? '0';
  if (!/^\d+$/.test(configuredHops)) {
    throw new Error('TRUST_PROXY_HOPS must be a non-negative integer');
  }

  const hops = Number(configuredHops);
  if (!Number.isSafeInteger(hops) || hops > 10) {
    throw new Error('TRUST_PROXY_HOPS must be between 0 and 10');
  }
  expressApp.set('trust proxy', hops);
}
