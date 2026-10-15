import { IHashService } from '../shared/application/interfaces/IHash';
import { PrismaService } from '../shared/infra/db/prisma/prisma.service';
import { UsersUseCases } from './application/useCases/users.use-cases';
import { IUserRepository } from './domain/user.repository';
import { UsersPrismaRepository } from './infra/db/prisma/users-prisma.repository';

const REPOSITORIES = {
  USER_REPOSITORY: {
    provide: 'UserRepository',
    useExisting: UsersPrismaRepository,
  },
  USER_PRISMA_REPOSITORY: {
    provide: UsersPrismaRepository,
    useFactory: (prismaService: PrismaService, hashService: IHashService) =>
      new UsersPrismaRepository(prismaService, hashService),
    inject: [PrismaService, 'IHashService'],
  },
};

const USE_CASES = {
  USERS_USE_CASES: {
    provide: UsersUseCases,
    useFactory: (userRepository: IUserRepository) =>
      new UsersUseCases(userRepository),
    inject: [REPOSITORIES.USER_REPOSITORY.provide],
  },
};

export const USER_PROVIDERS = { REPOSITORIES, USE_CASES };
