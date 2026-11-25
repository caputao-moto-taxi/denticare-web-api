import { corsOptions } from './basicConfigsConstants';

describe('corsOptions', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalCorsOrigins = process.env.CORS_ORIGINS;

  afterEach(() => {
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
    if (originalCorsOrigins === undefined) delete process.env.CORS_ORIGINS;
    else process.env.CORS_ORIGINS = originalCorsOrigins;
  });

  it('allows only configured origins and originless service requests', () => {
    process.env.NODE_ENV = 'production';
    process.env.CORS_ORIGINS = 'https://app.example.test';
    const options = corsOptions();

    expect(checkOrigin(options.origin, 'https://app.example.test')).toBe(true);
    expect(checkOrigin(options.origin, 'https://other.example.test')).toBe(
      false,
    );
    expect(checkOrigin(options.origin, undefined)).toBe(true);
  });

  it('requires an HTTPS allowlist in production and rejects wildcards', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.CORS_ORIGINS;
    expect(() => corsOptions()).toThrow('CORS_ORIGINS must be configured');

    process.env.CORS_ORIGINS = '*';
    expect(() => corsOptions()).toThrow(
      'CORS_ORIGINS must contain valid origins',
    );

    process.env.CORS_ORIGINS = 'http://app.example.test';
    expect(() => corsOptions()).toThrow(
      'CORS_ORIGINS must contain exact secure origins',
    );
  });
});

function checkOrigin(
  originOption: ReturnType<typeof corsOptions>['origin'],
  origin: string | undefined,
) {
  if (typeof originOption !== 'function') {
    throw new Error('Expected a dynamic CORS origin validator');
  }
  let allowed: boolean | undefined;
  originOption(origin, (_error, result) => {
    allowed = result;
  });
  return allowed;
}
