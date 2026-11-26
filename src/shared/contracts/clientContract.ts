export interface ClientResponseInterface<T = unknown> {
  message?: string;
  data?: T;
  validated?: boolean;
  log: 'log' | 'warn' | 'error' | 'debug' | 'fatal' | 'verbose';
}
export class ClientResponse<T = unknown> implements ClientResponseInterface<T> {
  message?: string;

  data?: T;

  validated?: boolean;

  log: ClientResponseInterface['log'];
}

export class ClientOkResponse<T = unknown>
  extends ClientResponse<T>
  implements ClientResponseInterface<T>
{
  validated = true;

  log: ClientResponseInterface['log'] = 'log';

  constructor(input: { message?: string; data?: T }) {
    super();
    Object.assign(this, input);
  }
}

export function clientOkResponse<T = unknown>(input: {
  message?: string;
  data?: T;
}) {
  return new ClientOkResponse(input);
}

export class ClientOkCreatedResponse<T = unknown>
  extends ClientResponse<T>
  implements ClientResponseInterface<T>
{
  validated = true;

  log: ClientResponseInterface['log'] = 'log';

  constructor(input: { message?: string; data?: T }) {
    super();
    Object.assign(this, input);
  }
}

export function clientOkCreatedResponse<T = unknown>(input: {
  message?: string;
  data?: T;
}) {
  return new ClientOkCreatedResponse(input);
}
export class ClientWarningResponse<T = unknown>
  extends ClientResponse<T>
  implements ClientResponseInterface<T>
{
  validated = true;

  log: ClientResponseInterface['log'] = 'warn';

  constructor(input: { message?: string; data?: T }) {
    super();

    Object.assign(this, input);
  }
}

export function clientWarningResponse<T = unknown>(input: {
  message?: string;
  data?: T;
}) {
  return new ClientWarningResponse(input);
}

export class ClientBadRequestResponse<T = unknown>
  extends ClientResponse<T>
  implements ClientResponseInterface<T>
{
  validated = false;

  log: ClientResponseInterface['log'] = 'error';

  constructor(input: { message?: string; data?: T }) {
    super();

    Object.assign(this, input);
  }
}

export function clientBadRequestResponse<T = unknown>(input: {
  message?: string;
  data?: T;
}) {
  return new ClientBadRequestResponse(input);
}

export class ClientErrorResponse<T = unknown>
  extends ClientResponse<T>
  implements ClientResponseInterface<T>
{
  validated = false;

  log: ClientResponseInterface['log'] = 'error';

  constructor(input: { message?: string; data?: T }) {
    super();

    Object.assign(this, input);
  }
}

export function clientErrorResponse<T = unknown>(input: {
  message?: string;
  data?: T;
}) {
  return new ClientErrorResponse(input);
}
