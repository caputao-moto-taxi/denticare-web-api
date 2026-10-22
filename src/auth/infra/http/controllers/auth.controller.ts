import {
  Body,
  BadRequestException,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Get,
  Patch,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthenticatedRequest, AuthUser } from '../../../auth-user';
import { CurrentUser } from '../../../current-user.decorator';
import { JwtAuthGuard } from '../../../jwt-auth.guard';
import {
  AuthActionTokenDto,
  EmailActionDto,
  LoginDto,
  RefreshTokenDto,
  RegisterDto,
  ResetPasswordDto,
  UpdateProfileDto,
} from './dtos/auth.dto';
import { GetProfileUseCase } from '../../../application/useCases/get-profile/get-profile-use-case';
import { LoginUseCase } from '../../../application/useCases/login/login-use-case';
import { LogoutUseCase } from '../../../application/useCases/logout/logout-use-case';
import { RegisterUseCase } from '../../../application/useCases/register/register-use-case';
import { UpdateProfileUseCase } from '../../../application/useCases/update-profile/update-profile-use-case';
import { RefreshUseCase } from '../../../application/useCases/refresh/refresh-use-case';
import { ManageProfileAvatarUseCase } from '../../../application/useCases/manage-profile-avatar/manage-profile-avatar-use-case';
import { ActivateAccountUseCase } from '../../../application/useCases/activate-account/activate-account-use-case';
import { RequestPasswordResetUseCase } from '../../../application/useCases/request-password-reset/request-password-reset-use-case';
import { ResetPasswordUseCase } from '../../../application/useCases/reset-password/reset-password-use-case';
import { ResendActivationUseCase } from '../../../application/useCases/resend-activation/resend-activation-use-case';

type AvatarUpload = { mimetype: string; size: number; buffer: Buffer };

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerUseCase: RegisterUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly getProfileUseCase: GetProfileUseCase,
    private readonly updateProfileUseCase: UpdateProfileUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly refreshUseCase: RefreshUseCase,
    private readonly manageProfileAvatar: ManageProfileAvatarUseCase,
    private readonly activateAccountUseCase: ActivateAccountUseCase,
    private readonly requestPasswordResetUseCase: RequestPasswordResetUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase,
    private readonly resendActivationUseCase: ResendActivationUseCase,
  ) { }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  register(@Body() input: RegisterDto) {
    return this.registerUseCase.execute({ input });
  }

  @Post('activate')
  @HttpCode(HttpStatus.OK)
  activateAccount(@Body() input: AuthActionTokenDto) {
    return this.activateAccountUseCase.execute(input.token);
  }

  @Post('activation/resend')
  @HttpCode(HttpStatus.OK)
  resendActivation(@Body() input: EmailActionDto) {
    return this.resendActivationUseCase.execute(input.email);
  }

  @Post('password/forgot')
  @HttpCode(HttpStatus.OK)
  requestPasswordReset(@Body() input: EmailActionDto) {
    return this.requestPasswordResetUseCase.execute(input.email);
  }

  @Post('password/reset')
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() input: ResetPasswordDto) {
    return this.resetPasswordUseCase.execute(input);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() input: LoginDto) {
    return this.loginUseCase.execute({ input });
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() input: RefreshTokenDto) {
    return this.refreshUseCase.execute({ input });
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  getProfile(@CurrentUser() user: AuthUser) {
    return this.getProfileUseCase.execute({ user });
  }

  @Get('me/avatar')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async getProfileAvatar(
    @CurrentUser() user: AuthUser,
    @Res() response: Response,
  ) {
    const file = await this.manageProfileAvatar.get(user);
    response.setHeader('Content-Type', file.mimeType);
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Content-Disposition', 'inline');
    response.setHeader('Content-Length', file.data.byteLength);
    return response.send(file.data);
  }

  @Post('me/avatar')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }),
  )
  uploadProfileAvatar(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file?: AvatarUpload,
  ) {
    if (
      !file?.size ||
      !['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)
    ) {
      throw new BadRequestException(
        'A non-empty JPEG, PNG, or WebP avatar is required',
      );
    }
    return this.manageProfileAvatar.upload(user, file);
  }

  @Patch('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  updateProfile(
    @CurrentUser() user: AuthUser,
    @Body() input: UpdateProfileDto,
  ) {
    return this.updateProfileUseCase.execute({ user, input });
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async logout(
    @CurrentUser() user: AuthUser,
    @Req() request: AuthenticatedRequest,
  ) {
    await this.logoutUseCase.execute({
      userId: user.id,
      authToken: request.authToken,
    });
  }
}
