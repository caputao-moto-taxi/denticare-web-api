import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { AuthUser } from '../../../auth/auth-user';
import { CurrentUser } from '../../../auth/current-user.decorator';
import { JwtAuthGuard } from '../../../auth/jwt-auth.guard';
import { PlatformOwnerGuard } from './platform-owner.guard';
import {
  RejectSubscriptionRequestDto,
  PlatformClinicFilterDto,
  RequestSubscriptionInformationDto,
  SubscriptionRequestFilterDto,
  UpdateSubscriptionSettingsDto,
} from './subscription.dto';
import { SubscriptionsService } from '../../application/subscriptions.service';

@ApiTags('Platform subscriptions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PlatformOwnerGuard)
@Controller('admin/subscriptions')
export class SubscriptionAdminController {
  constructor(private readonly subscriptions: SubscriptionsService) {}

  @Get('overview')
  overview() {
    return this.subscriptions.platformOverview();
  }

  @Get('clinics')
  clinics(@Query() filter: PlatformClinicFilterDto) {
    return this.subscriptions.listPlatformClinics(filter);
  }

  @Get('requests')
  listRequests(@Query() filter: SubscriptionRequestFilterDto) {
    return this.subscriptions.listAdminRequests(filter);
  }

  @Get('requests/:id')
  getRequest(@Param('id', ParseUUIDPipe) requestId: string) {
    return this.subscriptions.getAdminRequest(requestId);
  }

  @Get('requests/:id/proof')
  async getProof(
    @Param('id', ParseUUIDPipe) requestId: string,
    @CurrentUser() user: AuthUser,
    @Res() response: Response,
  ) {
    const proof = await this.subscriptions.getProof(requestId, user);
    let extension = 'jpg';
    if (proof.mimeType === 'application/pdf') extension = 'pdf';
    if (proof.mimeType === 'image/png') extension = 'png';
    response
      .status(200)
      .set({
        'Content-Type': proof.mimeType,
        'Content-Disposition': `inline; filename="${proof.id}.${extension}"`,
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "sandbox; default-src 'none'",
        'Cache-Control': 'private, no-store',
      })
      .send(proof.data);
  }

  @Post('requests/:id/review')
  markUnderReview(
    @Param('id', ParseUUIDPipe) requestId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.subscriptions.markUnderReview(requestId, user);
  }

  @Post('requests/:id/approve')
  approve(
    @Param('id', ParseUUIDPipe) requestId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.subscriptions.approve(requestId, user);
  }

  @Post('requests/:id/reject')
  reject(
    @Param('id', ParseUUIDPipe) requestId: string,
    @CurrentUser() user: AuthUser,
    @Body() input: RejectSubscriptionRequestDto,
  ) {
    return this.subscriptions.reject(requestId, user, input);
  }

  @Post('requests/:id/information')
  requestInformation(
    @Param('id', ParseUUIDPipe) requestId: string,
    @CurrentUser() user: AuthUser,
    @Body() input: RequestSubscriptionInformationDto,
  ) {
    return this.subscriptions.requestMoreInformation(requestId, user, input);
  }

  @Get('settings')
  settings() {
    return this.subscriptions.paymentInstructions();
  }

  @Put('settings')
  updateSettings(
    @CurrentUser() user: AuthUser,
    @Body() input: UpdateSubscriptionSettingsDto,
  ) {
    return this.subscriptions.updateSettings(user, input);
  }
}
