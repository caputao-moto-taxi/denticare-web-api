import {
  BadRequestException,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { ValidationExceptionFilter } from './shared/infra/filters/validation-exception-filter';

export function applyGlobalConfig(app: INestApplication) {
  const isProduction = process.env.NODE_ENV === 'production';
  app.useGlobalPipes(
    new ValidationPipe({
      errorHttpStatusCode: 422,
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory(errors) {
        if (isProduction) {
          return new BadRequestException('Request validation failed');
        }
        return new BadRequestException(
          errors.map((err) => ({
            property: err.property,
            constraints: err.constraints,
          })),
        );
      },
      enableDebugMessages: false,
    }),
  );
  app.useGlobalFilters(new ValidationExceptionFilter());
}
