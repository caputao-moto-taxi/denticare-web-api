import type { LogLevel } from '@nestjs/common';
import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

export const appSystemTag = 'Dentcare API';
export const appTitle = 'Dentcare API';
export const appVersion = '0.0.1';
export const appPort = () => process.env.PORT || 3000;
export const appFavicon = '';
export const appLogo = '';
export const appDocPath = '/api/doc';
export const appDocTitle = `${appTitle}`;
export const appDocDescription = `${appDocTitle} | Documentantion`;
export const appDocCustomCss = `
              .topbar-wrapper a > svg {  display: none; }
              .topbar-wrapper a { background-image: url('${appLogo}'); background-size: contain; background-repeat: no-repeat; height: 30px; width: 30px; }
              .swagger-ui .topbar { background-color: #01A687; }
        `;

export function getAllowedCorsOrigins(): string[] {
  const isProduction = process.env.NODE_ENV === 'production';
  const configuredOrigins = process.env.CORS_ORIGINS?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const origins = configuredOrigins?.length
    ? configuredOrigins
    : isProduction
      ? []
      : [
          'http://localhost:5173',
          'http://localhost:5174',
          'http://127.0.0.1:5173',
          'http://127.0.0.1:5174',
          'http://localhost:3000'
        ];

  if (isProduction && origins.length === 0) {
    throw new Error('CORS_ORIGINS must be configured in production');
  }

  for (const origin of origins) {
    let parsedOrigin: URL;
    try {
      parsedOrigin = new URL(origin);
    } catch {
      throw new Error('CORS_ORIGINS must contain valid origins');
    }

    if (
      parsedOrigin.origin !== origin ||
      (parsedOrigin.protocol !== 'https:' &&
        !(parsedOrigin.protocol === 'http:' && !isProduction))
    ) {
      throw new Error('CORS_ORIGINS must contain exact secure origins');
    }
  }

  return origins;
}

export function corsOptions(): CorsOptions {
  const allowedOrigins = new Set(getAllowedCorsOrigins());
  return {
    origin: (origin, callback) => {
      callback(null, !origin || allowedOrigins.has(origin));
    },
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
    exposedHeaders: ['Content-Type', 'Authorization'],
    preflightContinue: false,
    maxAge: 600,
  };
}
export const loggerLevels: LogLevel[] = ['log', 'error', 'warn'];
