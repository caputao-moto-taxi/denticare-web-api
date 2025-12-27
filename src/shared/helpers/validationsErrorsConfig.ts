import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ValidationError } from 'class-validator';
import { ClassValidatorHelper } from './classValidatorConfig';

const DEFAULT_ERROR_SEPARATOR = '; ';

export class ValidationFilterException extends HttpException {
  constructor(validationErrors: ValidationError[]) {
    const message = validationErrors
      .map((error) => error.toString())
      .join(DEFAULT_ERROR_SEPARATOR);

    super(message, HttpStatus.BAD_REQUEST);
  }
}

@Catch()
export class ValidationFilter<T> implements ExceptionFilter<T> {
  logger = new Logger(ValidationFilter.name);

  constructor(private readonly logException = false) {}

  i18nValidationExceptionFilterOptrions = {
    errorHttpStatusCode: HttpStatus.BAD_REQUEST,
    detailedErrors: false,
  };

  catch(exception: T, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const restContext = ctx.getResponse();
    const response = restContext.getResponse();
    const request = restContext.getRequest();

    const validationErrors = (
      exception as {
        extensions: { exception: { validationErrors: ValidationError[] } };
      }
    ).extensions?.exception?.validationErrors;

    if (validationErrors) {
      const message =
        ClassValidatorHelper.validationErrorsToString(validationErrors);
      this.logger.error(`[${request.method}] ${request.url}: ${message}`);

      response.errors = validationErrors.map((error: ValidationError) => ({
        message: error.toString(),
        extensions: {
          code: 'VALIDATION_ERROR',
        },
      }));

      return response;
    }

    if (exception) {
      this.logger.debug(exception);
      if (this.logException) {
        console.log(exception);
      }
    } else if (exception instanceof HttpException) {
      this.logger.debug(exception.message);
      if (this.logException) {
        console.log(exception);
      }
      response.status(exception.getStatus()).json(exception.message);
    } else {
      this.logger.debug(exception);
      if (this.logException) {
        console.log(exception);
      }

      response.status(HttpStatus.INTERNAL_SERVER_ERROR).json(String(exception));
    }
  }
}
