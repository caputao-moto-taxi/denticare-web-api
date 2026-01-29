import { Module } from '@nestjs/common';
import { SystemParameterService } from './systemParameters.service';
import { PrismaService } from '../db/prisma/prisma.service';

@Module({
  providers: [SystemParameterService, PrismaService],
  exports: [SystemParameterService],
  imports: [],
})
export class SystemParametersModule {}
