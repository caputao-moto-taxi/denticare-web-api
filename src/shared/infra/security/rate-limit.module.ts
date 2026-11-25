import { ThrottlerModule } from '@nestjs/throttler';
import { SystemParametersModule } from '../services/systemParameters.module';
import { SystemParameterService } from '../services/systemParameters.service';
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ApiThrottlerGuard } from './api-throttler.guard';

@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      imports: [SystemParametersModule],
      inject: [SystemParameterService],
      useFactory: (parameterService: SystemParameterService) => [
        {
          ttl: parameterService.getValueAsNumber('THROTTLER_TTL', 60000),
          limit: parameterService.getValueAsNumber('THROTTLER_LIMIT', 100),
        },
      ],
    }),
  ],
  providers: [{ provide: APP_GUARD, useClass: ApiThrottlerGuard }],
})
export class RateLimitModule {}
