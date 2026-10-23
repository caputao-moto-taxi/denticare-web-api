import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser } from '../../../auth/auth-user';
import { CurrentUser } from '../../../auth/current-user.decorator';
import { JwtAuthGuard } from '../../../auth/jwt-auth.guard';
import {
  CreateSubscriptionRequestDto,
  RespondToInformationRequestDto,
} from './subscription.dto';
import { ClinicAdminGuard } from './platform-owner.guard';
import {
  PaymentProofUpload,
  SubscriptionsService,
} from '../../application/subscriptions.service';

@ApiTags('Subscriptions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ClinicAdminGuard)
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptions: SubscriptionsService) {}

  @Get('options')
  listOptions() {
    return this.subscriptions.listOptions();
  }

  @Get('current')
  current(@CurrentUser() user: AuthUser) {
    return this.subscriptions.current(user);
  }

  @Get('payment-instructions')
  paymentInstructions() {
    return this.subscriptions.paymentInstructions();
  }

  @Post('requests')
  @UseInterceptors(
    FileInterceptor('proof', { limits: { fileSize: 5 * 1024 * 1024 } }),
  )
  createRequest(
    @CurrentUser() user: AuthUser,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() input: CreateSubscriptionRequestDto,
    @UploadedFile() file?: PaymentProofUpload,
  ) {
    return this.subscriptions.createRequest(
      user,
      idempotencyKey,
      input,
      file,
    );
  }

  @Get('requests')
  listMyRequests(@CurrentUser() user: AuthUser) {
    return this.subscriptions.listMyRequests(user);
  }

  @Get('history')
  history(@CurrentUser() user: AuthUser) {
    return this.subscriptions.history(user);
  }

  @Post('requests/:id/information-response')
  respondToInformationRequest(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) requestId: string,
    @Body() input: RespondToInformationRequestDto,
  ) {
    return this.subscriptions.respondToInformationRequest(
      user,
      requestId,
      input,
    );
  }
}
