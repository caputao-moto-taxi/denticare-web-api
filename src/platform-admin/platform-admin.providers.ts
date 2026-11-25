import { PrismaService } from '../shared/infra/db/prisma/prisma.service';
import { PlatformAdminService } from './application/platform-admin.service';
import { IPlatformAdminRepository } from './domain/platform-admin.repository';
import { PlatformAdminPrismaRepository } from './infra/db/prisma/platform-admin-prisma.repository';

export const PLATFORM_ADMIN_PROVIDERS = {
  REPOSITORY: {
    provide: PlatformAdminPrismaRepository,
    useFactory: (prisma: PrismaService) =>
      new PlatformAdminPrismaRepository(prisma),
    inject: [PrismaService],
  },
  REPOSITORY_PORT: {
    provide: 'PlatformAdminRepository',
    useExisting: PlatformAdminPrismaRepository,
  },
  SERVICE: {
    provide: PlatformAdminService,
    useFactory: (repository: IPlatformAdminRepository) =>
      new PlatformAdminService(repository),
    inject: ['PlatformAdminRepository'],
  },
};
