import {
  Catch,
  ExceptionFilter,
  ArgumentsHost,
  HttpStatus,
} from '@nestjs/common';
import { GqlContextType } from '@nestjs/graphql';
import { GraphQLError } from 'graphql';
import { InvalidUuidError } from '../../domain/value-objects/uuid.vo';

@Catch(InvalidUuidError)
export class InvalidUuidErrorFilter implements ExceptionFilter {
  catch(exception: InvalidUuidError, host: ArgumentsHost) {
    if (host.getType<GqlContextType>() !== 'graphql') {
      return null;
    }

    return new GraphQLError(exception.message, {
      extensions: {
        code: HttpStatus.BAD_REQUEST,
        error: 'INVALID_UUID_ERROR',
      },
    });
  }
}
