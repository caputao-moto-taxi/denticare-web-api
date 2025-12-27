import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from './shared/infra/config/config.module';
import { DatabaseModule } from './shared/infra/db/database.module';
import { HashModule } from './shared/application/hash.module';
import { ApplicationModule } from './applications/application.module';
import { NotificationModule } from './notifications/notifications.module';
import { ApiKeyLoggerMiddleware } from './shared/middlewares/apiKeyLogger.middleware';
import { LogsModule } from './logs/logs.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    HashModule,
    DatabaseModule,
    ApplicationModule,
    NotificationModule,
    LogsModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(ApiKeyLoggerMiddleware).forRoutes('*');
  }
}