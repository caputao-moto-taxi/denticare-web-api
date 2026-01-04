import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { withAccelerate } from '@prisma/extension-accelerate'

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({
      errorFormat: 'pretty',
      datasources: {
        db: {
          url: process.env.DATABASE_URL!,
        }
      },
      log: process.env.DB_LOGGING === 'true'
        ? ['query', 'info', 'warn']
        : [],
    })

    this.$extends(withAccelerate())
  }

  async onModuleInit() {
    await this.$connect()
  }

  async onModuleDestroy() {
    await this.$disconnect()
  }
}
