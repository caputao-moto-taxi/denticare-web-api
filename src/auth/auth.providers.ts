import { JwtService } from '@nestjs/jwt';
import { IHashService } from '../shared/application/interfaces/IHash';
import { PrismaService } from '../shared/infra/db/prisma/prisma.service';
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
import { AuthEmailService } from './domain/auth-email.service';
import { NodemailerAuthEmailService } from './infra/email/nodemailer-auth-email.service';
import { ActivateAccountUseCase } from './application/useCases/activate-account/activate-account-use-case';
import { RequestPasswordResetUseCase } from './application/useCases/request-password-reset/request-password-reset-use-case';
import { ResetPasswordUseCase } from './application/useCases/reset-password/reset-password-use-case';
import { ResendActivationUseCase } from './application/useCases/resend-activation/resend-activation-use-case';

const SERVICES = {
  AUTH_EMAIL: {
    provide: AuthEmailService,
    useClass: NodemailerAuthEmailService,
  },
};

const REPOSITORIES = {
  AUTH_REPOSITORY: {
    provide: 'AuthRepository',
    useExisting: AuthPrismaRepository,
  },
  AUTH_PRISMA_REPOSITORY: {
    provide: AuthPrismaRepository,
    useFactory: (
      prismaService: PrismaService,
      jwtService: JwtService,
      hashService: IHashService,
    ) => new AuthPrismaRepository(prismaService, jwtService, hashService),
    inject: [PrismaService, JwtService, 'IHashService'],
  },
};

const USE_CASES = {
  REGISTER: {
    provide: RegisterUseCase,
    useFactory: (repository: IAuthRepository, emailService: AuthEmailService) =>
      new RegisterUseCase(repository, emailService),
    inject: [REPOSITORIES.AUTH_REPOSITORY.provide, AuthEmailService],
  },
  ACTIVATE_ACCOUNT: {
    provide: ActivateAccountUseCase,
    useFactory: (repository: IAuthRepository) =>
      new ActivateAccountUseCase(repository),
    inject: [REPOSITORIES.AUTH_REPOSITORY.provide],
  },
  REQUEST_PASSWORD_RESET: {
    provide: RequestPasswordResetUseCase,
    useFactory: (repository: IAuthRepository, emailService: AuthEmailService) =>
      new RequestPasswordResetUseCase(repository, emailService),
    inject: [REPOSITORIES.AUTH_REPOSITORY.provide, AuthEmailService],
  },
  RESET_PASSWORD: {
    provide: ResetPasswordUseCase,
    useFactory: (repository: IAuthRepository) =>
      new ResetPasswordUseCase(repository),
    inject: [REPOSITORIES.AUTH_REPOSITORY.provide],
  },
  RESEND_ACTIVATION: {
    provide: ResendActivationUseCase,
    useFactory: (repository: IAuthRepository, emailService: AuthEmailService) =>
      new ResendActivationUseCase(repository, emailService),
    inject: [REPOSITORIES.AUTH_REPOSITORY.provide, AuthEmailService],
  },
  LOGIN: {
    provide: LoginUseCase,
    useFactory: (repository: IAuthRepository) => new LoginUseCase(repository),
    inject: [REPOSITORIES.AUTH_REPOSITORY.provide],
  },
  GET_PROFILE: {
    provide: GetProfileUseCase,
    useFactory: (repository: IAuthRepository) =>
      new GetProfileUseCase(repository),
    inject: [REPOSITORIES.AUTH_REPOSITORY.provide],
  },
  UPDATE_PROFILE: {
    provide: UpdateProfileUseCase,
    useFactory: (repository: IAuthRepository) =>
      new UpdateProfileUseCase(repository),
    inject: [REPOSITORIES.AUTH_REPOSITORY.provide],
  },
  LOGOUT: {
    provide: LogoutUseCase,
    useFactory: (repository: IAuthRepository) => new LogoutUseCase(repository),
    inject: [REPOSITORIES.AUTH_REPOSITORY.provide],
  },
  REFRESH: {
    provide: RefreshUseCase,
    useFactory: (repository: IAuthRepository) => new RefreshUseCase(repository),
    inject: [REPOSITORIES.AUTH_REPOSITORY.provide],
  },
  MANAGE_PROFILE_AVATAR: {
    provide: ManageProfileAvatarUseCase,
    useFactory: (repository: IAuthRepository, storage: PatientExamStorage) =>
      new ManageProfileAvatarUseCase(repository, storage),
    inject: [REPOSITORIES.AUTH_REPOSITORY.provide, PatientExamStorage],
  },
};

export const AUTH_PROVIDERS = { REPOSITORIES, SERVICES, USE_CASES };
