import { Global, Module } from '@nestjs/common';

import { ConfigService } from '@nestjs/config';
import { ConfigModule } from '../config/config.module';
import { PrismaService } from './prisma/prisma.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [ConfigService, PrismaService],
  exports: [PrismaService],
})
export class DatabaseModule {}
