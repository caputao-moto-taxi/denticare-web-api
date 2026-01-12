import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from './shared/infra/config/config.module';
import { DatabaseModule } from './shared/infra/db/database.module';
import { HashModule } from './shared/application/hash.module';
import { NotificationModule } from './notifications/notifications.module';
import { ApiKeyLoggerMiddleware } from './shared/middlewares/apiKeyLogger.middleware';
import { RateLimitModule } from './shared/infra/security/rate-limit.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    HashModule,
    DatabaseModule,
    NotificationModule,
    RateLimitModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(ApiKeyLoggerMiddleware).forRoutes('*');
  }
}
