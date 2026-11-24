import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { PlatformAdminController } from './infra/http/platform-admin.controller';
import { PLATFORM_ADMIN_PROVIDERS } from './platform-admin.providers';

@Module({
  imports: [AuthModule, SubscriptionsModule],
  controllers: [PlatformAdminController],
  providers: [...Object.values(PLATFORM_ADMIN_PROVIDERS)],
})
export class PlatformAdminModule {}
