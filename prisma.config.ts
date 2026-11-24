import { config as loadEnv } from 'dotenv';
import { join } from 'node:path';
import { defineConfig, env } from 'prisma/config';

loadEnv({
  path: join(
    process.cwd(),
    `.env.${process.env.NODE_ENV || 'development'}`,
  ),
});

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'ts-node prisma/seed.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
