import { HttpException, HttpStatus } from '@nestjs/common';
import { HttpResponseType } from '../../../shared/contracts/httpContracts';
import {
  AppointmentAccessDeniedError,
  AppointmentConflictError,
  AppointmentError,
  AppointmentNotFoundError,
  AppointmentRuleViolationError,
} from '../../domain';

export type AppointmentErrorBody = string | object;

const ERROR_RESPONSES: [
  new (message: string) => AppointmentError,
  HttpStatus,
  string,
][] = [
  [AppointmentNotFoundError, HttpStatus.NOT_FOUND, 'Not Found'],
  [AppointmentAccessDeniedError, HttpStatus.FORBIDDEN, 'Forbidden'],
  [AppointmentConflictError, HttpStatus.CONFLICT, 'Conflict'],
  [AppointmentRuleViolationError, HttpStatus.BAD_REQUEST, 'Bad Request'],
];

// Translates expected failures into HTTP responses; anything else is a bug
// and keeps propagating so the framework reports it as a server error.
export function toAppointmentErrorResponse(
  error: unknown,
): HttpResponseType<AppointmentErrorBody> {
  if (error instanceof HttpException) {
    return new HttpResponseType({
      status: error.getStatus(),
      data: error.getResponse(),
    });
  }
  const match = ERROR_RESPONSES.find(([type]) => error instanceof type);
  if (!match) throw error;
  const [, status, label] = match;
  return new HttpResponseType({
    status,
    data: {
      statusCode: status,
      message: (error as AppointmentError).message,
      error: label,
    },
  });
}
