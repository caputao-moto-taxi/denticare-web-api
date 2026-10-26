import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser } from '../auth/auth-user';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetPatientMarketingConsentUseCase } from './application/useCases/get-patient-marketing-consent/get-patient-marketing-consent-use-case';
import { ListCampaignAudienceUseCase } from './application/useCases/list-campaign-audience/list-campaign-audience-use-case';
import { ListCampaignsUseCase } from './application/useCases/list-campaigns/list-campaigns-use-case';
import { SendCampaignUseCase } from './application/useCases/send-campaign/send-campaign-use-case';
import { UpdatePatientMarketingConsentUseCase } from './application/useCases/update-patient-marketing-consent/update-patient-marketing-consent-use-case';
import {
  CampaignAudienceQueryDto,
  SendCampaignDto,
  UpdatePatientMarketingConsentDto,
} from './communications.dto';

@ApiTags('Communications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('communications')
export class CommunicationsController {
  constructor(
    private readonly getConsent: GetPatientMarketingConsentUseCase,
    private readonly updateConsent: UpdatePatientMarketingConsentUseCase,
    private readonly listCampaignsUseCase: ListCampaignsUseCase,
    private readonly listAudienceUseCase: ListCampaignAudienceUseCase,
    private readonly sendCampaignUseCase: SendCampaignUseCase,
  ) {}

  @Get('patient-consent')
  getMyMarketingConsent(@CurrentUser() user: AuthUser) {
    return this.getConsent.execute(user);
  }

  @Patch('patient-consent')
  updateMyMarketingConsent(
    @CurrentUser() user: AuthUser,
    @Body() input: UpdatePatientMarketingConsentDto,
  ) {
    return this.updateConsent.execute(user, input);
  }

  @Get('campaigns')
  listCampaigns(@CurrentUser() user: AuthUser) {
    return this.listCampaignsUseCase.execute(user);
  }

  @Get('audience')
  listAudience(
    @CurrentUser() user: AuthUser,
    @Query() query: CampaignAudienceQueryDto,
  ) {
    return this.listAudienceUseCase.execute(user, query.channel, query.search);
  }

  @Post('campaigns')
  sendCampaign(@CurrentUser() user: AuthUser, @Body() input: SendCampaignDto) {
    return this.sendCampaignUseCase.execute(user, input);
  }
}
