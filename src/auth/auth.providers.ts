import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { IHashService } from '../shared/application/interfaces/IHash';
import { PrismaService } from '../shared/infra/db/prisma/prisma.service';
import { AuthenticateRequestUseCase } from './application/useCases/authenticate-request/authenticate-request-use-case';
import { CheckPermissionsUseCase } from './application/useCases/check-permissions/check-permissions-use-case';
import { GetProfileUseCase } from './application/useCases/get-profile/get-profile-use-case';
import { LoginUseCase } from './application/useCases/login/login-use-case';
import { LogoutUseCase } from './application/useCases/logout/logout-use-case';
import { RegisterUseCase } from './application/useCases/register/register-use-case';
import { UpdateProfileUseCase } from './application/useCases/update-profile/update-profile-use-case';
import { RefreshUseCase } from './application/useCases/refresh/refresh-use-case';
import { ManageProfileAvatarUseCase } from './application/useCases/manage-profile-avatar/manage-profile-avatar-use-case';
import { IAuthRepository } from './domain/auth.repository';
import { AuthPrismaRepository } from './infra/db/prisma/auth-prisma.repository';
import { PatientExamStorage } from '../patients/infra/storage/patient-exam-storage';
import { ActivateAccountUseCase } from './application/useCases/activate-account/activate-account-use-case';
import { RequestPasswordResetUseCase } from './application/useCases/request-password-reset/request-password-reset-use-case';
import { ResetPasswordUseCase } from './application/useCases/reset-password/reset-password-use-case';
import { ResendActivationUseCase } from './application/useCases/resend-activation/resend-activation-use-case';
import { SendMailServiceUseCase } from '../shared/infra/services/sendEmailNotification.service';

const SERVICES = {
  SEND_MAIL: {
    provide: SendMailServiceUseCase,
    useClass: SendMailServiceUseCase,
  },
};

const REPOSITORIES = {
  AUTH_REPOSITORY: {
    provide: 'AuthRepository',
    useExisting: AuthPrismaRepository,
  },
  AUTH_PRISMA_REPOSITORY: {
    provide: AuthPrismaRepository,
    useFactory: (prismaService: PrismaService) =>
      new AuthPrismaRepository(prismaService),
    inject: [PrismaService],
  },
};

const USE_CASES = {
  CHECK_PERMISSIONS: {
    provide: CheckPermissionsUseCase,
    useClass: CheckPermissionsUseCase,
  },
  AUTHENTICATE_REQUEST: {
    provide: AuthenticateRequestUseCase,
    useFactory: (repository: IAuthRepository, jwtService: JwtService) =>
      new AuthenticateRequestUseCase(repository, jwtService),
    inject: [REPOSITORIES.AUTH_REPOSITORY.provide, JwtService],
  },
  REGISTER: {
    provide: RegisterUseCase,
    useFactory: (
      repository: IAuthRepository,
      sendMailService: SendMailServiceUseCase,
      hashService: IHashService,
    ) => new RegisterUseCase(repository, sendMailService, hashService),
    inject: [
      REPOSITORIES.AUTH_REPOSITORY.provide,
      SendMailServiceUseCase,
      'IHashService',
    ],
  },
  ACTIVATE_ACCOUNT: {
    provide: ActivateAccountUseCase,
    useFactory: (
      repository: IAuthRepository,
      sendMailService: SendMailServiceUseCase,
    ) => new ActivateAccountUseCase(repository, sendMailService),
    inject: [REPOSITORIES.AUTH_REPOSITORY.provide, SendMailServiceUseCase],
  },
  REQUEST_PASSWORD_RESET: {
    provide: RequestPasswordResetUseCase,
    useFactory: (
      repository: IAuthRepository,
      sendMailService: SendMailServiceUseCase,
    ) => new RequestPasswordResetUseCase(repository, sendMailService),
    inject: [REPOSITORIES.AUTH_REPOSITORY.provide, SendMailServiceUseCase],
  },
  RESET_PASSWORD: {
    provide: ResetPasswordUseCase,
    useFactory: (repository: IAuthRepository, hashService: IHashService) =>
      new ResetPasswordUseCase(repository, hashService),
    inject: [REPOSITORIES.AUTH_REPOSITORY.provide, 'IHashService'],
  },
  RESEND_ACTIVATION: {
    provide: ResendActivationUseCase,
    useFactory: (
      repository: IAuthRepository,
      sendMailService: SendMailServiceUseCase,
    ) => new ResendActivationUseCase(repository, sendMailService),
    inject: [REPOSITORIES.AUTH_REPOSITORY.provide, SendMailServiceUseCase],
  },
  LOGIN: {
    provide: LoginUseCase,
    useFactory: (
      repository: IAuthRepository,
      hashService: IHashService,
      jwtService: JwtService,
      configService: ConfigService,
    ) => new LoginUseCase(repository, hashService, jwtService, configService),
    inject: [
      REPOSITORIES.AUTH_REPOSITORY.provide,
      'IHashService',
      JwtService,
      ConfigService,
    ],
  },
  GET_PROFILE: {
    provide: GetProfileUseCase,
    useFactory: (repository: IAuthRepository) =>
      new GetProfileUseCase(repository),
    inject: [REPOSITORIES.AUTH_REPOSITORY.provide],
  },
  UPDATE_PROFILE: {
    provide: UpdateProfileUseCase,
    useFactory: (repository: IAuthRepository, hashService: IHashService) =>
      new UpdateProfileUseCase(repository, hashService),
    inject: [REPOSITORIES.AUTH_REPOSITORY.provide, 'IHashService'],
  },
  LOGOUT: {
    provide: LogoutUseCase,
    useFactory: (repository: IAuthRepository) => new LogoutUseCase(repository),
    inject: [REPOSITORIES.AUTH_REPOSITORY.provide],
  },
  REFRESH: {
    provide: RefreshUseCase,
    useFactory: (
      repository: IAuthRepository,
      jwtService: JwtService,
      configService: ConfigService,
    ) => new RefreshUseCase(repository, jwtService, configService),
    inject: [REPOSITORIES.AUTH_REPOSITORY.provide, JwtService, ConfigService],
  },
  MANAGE_PROFILE_AVATAR: {
    provide: ManageProfileAvatarUseCase,
    useFactory: (repository: IAuthRepository, storage: PatientExamStorage) =>
      new ManageProfileAvatarUseCase(repository, storage),
    inject: [REPOSITORIES.AUTH_REPOSITORY.provide, PatientExamStorage],
  },
};

export const AUTH_PROVIDERS = { REPOSITORIES, SERVICES, USE_CASES };
