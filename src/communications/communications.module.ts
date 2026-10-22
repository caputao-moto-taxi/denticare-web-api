import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CommunicationsController } from './communications.controller';
import { CommunicationDeliveryService } from './communication-delivery.service';
import { CommunicationsService } from './communications.service';

@Module({
  imports: [AuthModule],
  controllers: [CommunicationsController],
  providers: [CommunicationsService, CommunicationDeliveryService],
})
export class CommunicationsModule {}
