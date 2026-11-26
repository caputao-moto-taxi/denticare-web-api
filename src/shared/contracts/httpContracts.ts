import { HttpStatus } from '@nestjs/common';

export type HttpResponse<T = unknown> =
  | HttpResponseType<T>
  | HttpResponseType<string>
  | HttpResponseType<ErrorPayload>;

type ErrorPayload = { message: string; stack?: string };
type HttpResponseInput<T> = {
  status: number;
  data: T;
  headers?: Record<string, string | number | readonly string[]>;
};

type SanitizedData<T> = T | { raw: string };

export class HttpResponseType<T = unknown> {
  status: number;
  data: SanitizedData<T>;
  headers?: Record<string, string | number | readonly string[]>;

  constructor(input: HttpResponseInput<T>) {
    this.status = input.status;
    this.data = sanitize(input.data);
    if (input.headers) this.headers = input.headers;
  }
}

export class HttpResponseTypeError<T = unknown> extends HttpResponseType<T> {
  constructor(input: HttpResponseInput<T>) {
    super(input);
  }
}

export class ErrorResponse extends HttpResponseTypeError<ErrorPayload> {
  constructor(error: unknown) {
    super({
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      data: sanitizeError(error),
    });
  }
}
export const errorResponse = (error: unknown) => new ErrorResponse(error);

export class BadRequestResponse extends HttpResponseTypeError {
  constructor(message: string) {
    super({
      status: HttpStatus.BAD_REQUEST,
      data: message,
    });
  }
}

export const forbiddenResponse = (error: unknown) =>
  new HttpResponseType({
    status: HttpStatus.FORBIDDEN,
    data: sanitizeError(error),
  });

export const badRequestResponse = (data: { message: string }) =>
  new HttpResponseType({
    status: HttpStatus.BAD_REQUEST,
    data,
  });

export const successResponse = <T>(data: T): HttpResponseType<T> =>
  new HttpResponseType({
    status: HttpStatus.OK,
    data,
  });

export const successResponseCustom = <T>(
  data: T,
  headers?: Record<string, string | number | readonly string[]>,
) =>
  new HttpResponseType({
    status: HttpStatus.OK,
    data,
    headers,
  });

export const noContentResponse = () =>
  new HttpResponseType({
    status: HttpStatus.NO_CONTENT,
    data: null,
  });

export class AcceptedResponse<T> extends HttpResponseType<T> {
  constructor(data: T) {
    super({
      status: HttpStatus.ACCEPTED,
      data,
    });
  }
}
export const acceptedResponse = <T>(data: T) => new AcceptedResponse(data);

export class CreatedResponse<T> extends HttpResponseType<T> {
  constructor(data: T) {
    super({
      status: HttpStatus.CREATED,
      data,
    });
  }
}
export const createdResponse = <T>(data: T) => new CreatedResponse(data);

export const notAcceptableResponse = <T>(data: T) =>
  new HttpResponseType({
    status: HttpStatus.NOT_ACCEPTABLE,
    data,
  });

export const unauthorized = <T>(data: T) =>
  new HttpResponseType({
    status: HttpStatus.UNAUTHORIZED,
    data,
  });

function sanitize<T>(data: T): SanitizedData<T> {
  if (typeof data !== 'object' || data === null) return data;

  try {
    return JSON.parse(JSON.stringify(data)) as T;
  } catch {
    return { raw: String(data) };
  }
}

function sanitizeError(error: unknown): ErrorPayload {
  if (typeof error === 'string') return { message: error };
  if (typeof error !== 'object' || error === null) {
    return { message: 'Internal Server Error' };
  }

  const message =
    'message' in error && typeof error.message === 'string'
      ? error.message
      : 'Internal Server Error';
  const stack =
    'stack' in error && typeof error.stack === 'string'
      ? error.stack
      : undefined;

  return {
    message,
    ...(stack ? { stack } : {}),
  };
}
