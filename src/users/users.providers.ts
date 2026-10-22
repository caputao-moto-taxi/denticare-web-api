import { IHashService } from '../shared/application/interfaces/IHash';
import { PrismaService } from '../shared/infra/db/prisma/prisma.service';
import {
  CreateUserUseCase,
  DeleteUserUseCase,
  GetUserPermissionsUseCase,
  GetUserUseCase,
  ListUsersUseCase,
  SetUserPermissionsUseCase,
  SetUserStatusUseCase,
  UpdateUserUseCase,
} from './application/useCases';
import { IUserRepository } from './domain/user.repository';
import { UsersPrismaRepository } from './infra/db/prisma/users-prisma.repository';

const REPOSITORIES = {
  USER_REPOSITORY: {
    provide: 'UserRepository',
    useExisting: UsersPrismaRepository,
  },
  USER_PRISMA_REPOSITORY: {
    provide: UsersPrismaRepository,
    useFactory: (prismaService: PrismaService) =>
      new UsersPrismaRepository(prismaService),
    inject: [PrismaService],
  },
};

const USE_CASES = {
  LIST_USERS_USE_CASE: {
    provide: ListUsersUseCase,
    useFactory: (userRepository: IUserRepository) =>
      new ListUsersUseCase(userRepository),
    inject: [REPOSITORIES.USER_REPOSITORY.provide],
  },
  GET_USER_USE_CASE: {
    provide: GetUserUseCase,
    useFactory: (userRepository: IUserRepository) =>
      new GetUserUseCase(userRepository),
    inject: [REPOSITORIES.USER_REPOSITORY.provide],
  },
  GET_USER_PERMISSIONS_USE_CASE: {
    provide: GetUserPermissionsUseCase,
    useFactory: (userRepository: IUserRepository) =>
      new GetUserPermissionsUseCase(userRepository),
    inject: [REPOSITORIES.USER_REPOSITORY.provide],
  },
  SET_USER_PERMISSIONS_USE_CASE: {
    provide: SetUserPermissionsUseCase,
    useFactory: (userRepository: IUserRepository) =>
      new SetUserPermissionsUseCase(userRepository),
    inject: [REPOSITORIES.USER_REPOSITORY.provide],
  },
  CREATE_USER_USE_CASE: {
    provide: CreateUserUseCase,
    useFactory: (userRepository: IUserRepository, hashService: IHashService) =>
      new CreateUserUseCase(userRepository, hashService),
    inject: [REPOSITORIES.USER_REPOSITORY.provide, 'IHashService'],
  },
  UPDATE_USER_USE_CASE: {
    provide: UpdateUserUseCase,
    useFactory: (userRepository: IUserRepository) =>
      new UpdateUserUseCase(userRepository),
    inject: [REPOSITORIES.USER_REPOSITORY.provide],
  },
  SET_USER_STATUS_USE_CASE: {
    provide: SetUserStatusUseCase,
    useFactory: (userRepository: IUserRepository) =>
      new SetUserStatusUseCase(userRepository),
    inject: [REPOSITORIES.USER_REPOSITORY.provide],
  },
  DELETE_USER_USE_CASE: {
    provide: DeleteUserUseCase,
    useFactory: (userRepository: IUserRepository) =>
      new DeleteUserUseCase(userRepository),
    inject: [REPOSITORIES.USER_REPOSITORY.provide],
  },
};

export const USER_PROVIDERS = { REPOSITORIES, USE_CASES };
