import { HttpStatus } from '@nestjs/common';

export type HttpResponse<T = any> =
  | HttpResponseType<T>
  | HttpResponseType<string>;

export class HttpResponseType<T = any> {
  status: number;
  data: T;
  headers?: Record<string, any>;

  constructor(input: HttpResponseType<T>) {
    this.status = input.status;
    this.data = sanitize(input.data);
    if (input.headers) this.headers = input.headers;
  }
}

export class HttpResponseTypeError<T = any> extends HttpResponseType<T> {
  constructor(input: HttpResponseTypeError<T>) {
    super(input);
  }
}

export class ErrorResponse extends HttpResponseTypeError {
  constructor(error: Error) {
    super({
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      data: sanitizeError(error),
    });
  }
}
export const errorResponse = (error: Error) => new ErrorResponse(error);

export class BadRequestResponse extends HttpResponseTypeError {
  constructor(message: string) {
    super({
      status: HttpStatus.BAD_REQUEST,
      data: message,
    });
  }
}

export const forbiddenResponse = (error: any) =>
  new HttpResponseType({
    status: HttpStatus.FORBIDDEN,
    data: sanitizeError(error),
  });

export const badRequestResponse = (data: { message: string }) =>
  new HttpResponseType({
    status: HttpStatus.BAD_REQUEST,
    data,
  });

export const successResponse = (data: any) =>
  new HttpResponseType({
    status: HttpStatus.OK,
    data,
  });

export const successResponseCustom = (data: any, headers?: any) =>
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

export class AcceptedResponse extends HttpResponseType {
  constructor(data: any) {
    super({
      status: HttpStatus.ACCEPTED,
      data,
    });
  }
}
export const acceptedResponse = (data: any) => new AcceptedResponse(data);

export class CreatedResponse extends HttpResponseType {
  constructor(data: any) {
    super({
      status: HttpStatus.CREATED,
      data,
    });
  }
}
export const createdResponse = (data: any) => new CreatedResponse(data);

export const notAcceptableResponse = (data: any) =>
  new HttpResponseType({
    status: HttpStatus.NOT_ACCEPTABLE,
    data,
  });

export const unauthorized = (data: any) =>
  new HttpResponseType({
    status: HttpStatus.UNAUTHORIZED,
    data,
  });

function sanitize(data: any): any {
  if (typeof data !== 'object' || data === null) return data;

  try {
    return JSON.parse(JSON.stringify(data));
  } catch (_) {
    return { raw: String(data) };
  }
}

function sanitizeError(error: any): any {
  if (typeof error === 'string') return { message: error };
  return {
    message: error?.message ?? 'Internal Server Error',
    stack: error?.stack,
  };
}
