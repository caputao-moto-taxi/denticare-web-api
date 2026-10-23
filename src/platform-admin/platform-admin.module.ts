import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { PlatformAdminController } from './infra/http/platform-admin.controller';
import { PlatformAdminService } from './application/platform-admin.service';

@Module({
  imports: [AuthModule, SubscriptionsModule],
  controllers: [PlatformAdminController],
  providers: [PlatformAdminService],
})
export class PlatformAdminModule {}
