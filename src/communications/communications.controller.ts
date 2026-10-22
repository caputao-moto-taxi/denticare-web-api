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
import { CommunicationsService } from './communications.service';
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
  constructor(private readonly communications: CommunicationsService) {}

  @Get('patient-consent')
  getMyMarketingConsent(@CurrentUser() user: AuthUser) {
    return this.communications.getMyMarketingConsent(user);
  }

  @Patch('patient-consent')
  updateMyMarketingConsent(
    @CurrentUser() user: AuthUser,
    @Body() input: UpdatePatientMarketingConsentDto,
  ) {
    return this.communications.updateMyMarketingConsent(user, input);
  }

  @Get('campaigns')
  listCampaigns(@CurrentUser() user: AuthUser) {
    return this.communications.listCampaigns(user);
  }

  @Get('audience')
  listAudience(
    @CurrentUser() user: AuthUser,
    @Query() query: CampaignAudienceQueryDto,
  ) {
    return this.communications.listAudience(user, query.channel, query.search);
  }

  @Post('campaigns')
  sendCampaign(@CurrentUser() user: AuthUser, @Body() input: SendCampaignDto) {
    return this.communications.sendCampaign(user, input);
  }
}
