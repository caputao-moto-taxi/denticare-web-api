import type { LogLevel } from "@nestjs/common";

export const appSystemTag = 'Dentcare Notiifications Service';
export const appTitle = 'Dentcare Notiifications Service';
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
export const appDocUsername = () => process.env.USER_DOCS ?? 'doc';
export const appDocPassword = () => process.env.PASS_DOCS ?? 'password';

export const corsOptions = {
      origin: '*',
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
      allowedHeaders: 'Content-Type,Authorization',
      exposedHeaders: ['Content-Type', 'Authorization'],
      preflightContinue: false,
};
export const loggerLevels: LogLevel[] = ['log', 'error', 'warn'];

