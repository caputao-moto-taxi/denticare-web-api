import { JwtService } from '@nestjs/jwt';
import { IHashService } from '../shared/application/interfaces/IHash';
import { PrismaService } from '../shared/infra/db/prisma/prisma.service';
import { AuthUseCases } from './application/useCases/auth.use-cases';
import { IAuthRepository } from './domain/auth.repository';
import { AuthPrismaRepository } from './infra/db/prisma/auth-prisma.repository';

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
  AUTH_USE_CASES: {
    provide: AuthUseCases,
    useFactory: (authRepository: IAuthRepository) =>
      new AuthUseCases(authRepository),
    inject: [REPOSITORIES.AUTH_REPOSITORY.provide],
  },
};

export const AUTH_PROVIDERS = { REPOSITORIES, USE_CASES };
