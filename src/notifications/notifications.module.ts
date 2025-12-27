import { Module } from '@nestjs/common';
import { NotificationController } from './infra/http/controllers/notificationsController';
import { NOTIFICATION_PROVIDERS } from './notifications.providers';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ScheduleModule.forRoot({
      cronJobs: true,
    }),
  ],
  controllers: [NotificationController],
  providers: [
    ...Object.values(NOTIFICATION_PROVIDERS.REPOSITORIES),
    ...Object.values(NOTIFICATION_PROVIDERS.USE_CASES),
  ],
  exports: [NOTIFICATION_PROVIDERS.REPOSITORIES.NOTIFICATION_REPOSITORY.provide],
})
export class NotificationModule {}
