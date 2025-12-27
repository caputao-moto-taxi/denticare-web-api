import { Module } from '@nestjs/common';
import {
  ConfigModuleOptions,
  ConfigModule as NestConfigModule,
} from '@nestjs/config';
import { join } from 'path';

type DB_SCHEMA_TYPE = {
  DATABASE_URL: string;
};

export const CONFIG_DB_SCHEMA = {
  DATABASE_URL: (value: string) => {
    if (!value || typeof value !== 'string') {
      throw new Error('DATABASE_URL is required and must be a string');
    }
    return value;
  },
};

export type CONFIG_SCHEMA_TYPE = DB_SCHEMA_TYPE;

@Module({})
export class ConfigModule extends NestConfigModule {
  static forRoot(options: ConfigModuleOptions = {}) {
    const { envFilePath, ...otherOptions } = options;

    return super.forRoot({
      isGlobal: true,
      envFilePath: [
      ...(Array.isArray(envFilePath) ? envFilePath : [envFilePath!]),
      join(
        process.cwd(),
        './',
        `.env.${process.env.NODE_ENV || 'development'}`,
      ),
      join(process.cwd(), `.env`),
      ],
      validate: (config: Record<string, any>) => {
      Object.keys(CONFIG_DB_SCHEMA).forEach((key) => {
        CONFIG_DB_SCHEMA[key](config[key]);
      });
      return config;
      },
      ...otherOptions,
    });
  }
}
