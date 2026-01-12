import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { withAccelerate } from '@prisma/extension-accelerate';
import { PrismaClient } from '../../../../../generated/prisma';

const connectionString = `${process.env.DATABASE_URL}`;

const adapter = new PrismaPg({ connectionString });

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({
      errorFormat: 'pretty',
      adapter: adapter,
      log: process.env.DB_LOGGING === 'true' ? ['query', 'info', 'warn'] : [],
    });
    const total = 0;
    this.$extends({
      client: {
        $log: (s: string) => console.log(s),
        async $totalQueries() {
          return total;
        },
      },
      query: {
        $allModels: {
          async $allOperations({ query, args }) {
            total + 1;
            return query(args);
          },
        },
      },
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
