import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CommunicationsController } from './communications.controller';
import { CommunicationDeliveryGateway } from './application/communication-delivery.gateway';
import { PatientSmsJobsRepository } from './application/patient-sms-jobs.repository';
import { GetPatientMarketingConsentUseCase } from './application/useCases/get-patient-marketing-consent/get-patient-marketing-consent-use-case';
import { ListCampaignAudienceUseCase } from './application/useCases/list-campaign-audience/list-campaign-audience-use-case';
import { ListCampaignsUseCase } from './application/useCases/list-campaigns/list-campaigns-use-case';
import { SendCampaignUseCase } from './application/useCases/send-campaign/send-campaign-use-case';
import { UpdatePatientMarketingConsentUseCase } from './application/useCases/update-patient-marketing-consent/update-patient-marketing-consent-use-case';
import { CommunicationsRepository } from './domain/communications.repository';
import { CommunicationsPrismaRepository } from './infra/db/prisma/communications-prisma.repository';
import { PatientSmsJobsPrismaRepository } from './infra/db/prisma/patient-sms-jobs-prisma.repository';
import { CommunicationDeliveryService } from './communication-delivery.service';
import { PatientSmsJobsService } from './patient-sms-jobs.service';

@Module({
  imports: [AuthModule],
  controllers: [CommunicationsController],
  providers: [
    GetPatientMarketingConsentUseCase,
    UpdatePatientMarketingConsentUseCase,
    ListCampaignsUseCase,
    ListCampaignAudienceUseCase,
    SendCampaignUseCase,
    {
      provide: CommunicationsRepository,
      useClass: CommunicationsPrismaRepository,
    },
    {
      provide: PatientSmsJobsRepository,
      useClass: PatientSmsJobsPrismaRepository,
    },
    {
      provide: CommunicationDeliveryGateway,
      useExisting: CommunicationDeliveryService,
    },
    CommunicationDeliveryService,
    PatientSmsJobsService,
  ],
})
export class CommunicationsModule {}
