import { PrismaService } from '../shared/infra/db/prisma/prisma.service';
import { CreateApplicationUseCase } from './app/useCases/create-application';
import { DeleteApplicationUseCase } from './app/useCases/delete-application';
import { GetApplicationUseCase } from './app/useCases/get-application';
import { ListApplicationUseCase } from './app/useCases/list-applications';
import { UpdateApplicationUseCase } from './app/useCases/update-application';
import { IApplicationRepository } from './domain/application.repository';
import { ApplicationPrismaRepository } from './infra/db/prisma/application-prisma.repository';

export const REPOSITORIES = {
  APPLICATION_REPOSITORY: {
    provide: 'ApplicationRepository',
    useExisting: ApplicationPrismaRepository,
  },
  APPLICATION_PRISMA_REPOSITORY: {
    provide: ApplicationPrismaRepository,
    useFactory: (prismaService: PrismaService) => {
      return new ApplicationPrismaRepository(prismaService);
    },
    inject: [PrismaService],
  },
};

export const USE_CASES = {
  CREATE_APPLICATION_USE_CASE: {
    provide: CreateApplicationUseCase,
    useFactory: (applicationRepository: IApplicationRepository) => {
      return new CreateApplicationUseCase(applicationRepository);
    },
    inject: [REPOSITORIES.APPLICATION_REPOSITORY.provide],
  },
  GET_APPLICATION_USE_CASE: {
    provide: GetApplicationUseCase,
    useFactory: (applicationRepository: IApplicationRepository) => {
      return new GetApplicationUseCase(applicationRepository);
    },
    inject: [REPOSITORIES.APPLICATION_REPOSITORY.provide],
  },
  LIST_APPLICATION_USE_CASE: {
    provide: ListApplicationUseCase,
    useFactory: (applicationRepository: IApplicationRepository) => {
      return new ListApplicationUseCase(applicationRepository);
    },
    inject: [REPOSITORIES.APPLICATION_REPOSITORY.provide],
  },
  DELETE_APPLICATION_USE_CASE: {
    provide: DeleteApplicationUseCase,
    useFactory: (applicationRepository: IApplicationRepository) => {
      return new DeleteApplicationUseCase(applicationRepository);
    },
    inject: [REPOSITORIES.APPLICATION_REPOSITORY.provide],
  },
  UPDATE_APPLICATION_USE_CASE: {
    provide: UpdateApplicationUseCase,
    useFactory: (applicationRepository: IApplicationRepository) => {
      return new UpdateApplicationUseCase(applicationRepository);
    },
    inject: [REPOSITORIES.APPLICATION_REPOSITORY.provide],
  },
};

export const APPLICATION_PROVIDERS = {
  REPOSITORIES,
  USE_CASES,
};
