import { PrismaService } from '../shared/infra/db/prisma/prisma.service';
import { ChatUseCases } from './application/useCases/chat.use-cases';
import { IChatRepository } from './domain/chat.repository';
import { ChatPrismaRepository } from './infra/db/prisma/chat-prisma.repository';
import { ChatRealtimeService } from './infra/realtime/chat-realtime.service';

const REPOSITORIES = {
  CHAT_REPOSITORY: {
    provide: 'ChatRepository',
    useExisting: ChatPrismaRepository,
  },
  CHAT_PRISMA_REPOSITORY: {
    provide: ChatPrismaRepository,
    useFactory: (prismaService: PrismaService) =>
      new ChatPrismaRepository(prismaService),
    inject: [PrismaService],
  },
};

const USE_CASES = {
  CHAT_USE_CASES: {
    provide: ChatUseCases,
    useFactory: (
      chatRepository: IChatRepository,
      realtime: ChatRealtimeService,
    ) => new ChatUseCases(chatRepository, realtime),
    inject: [REPOSITORIES.CHAT_REPOSITORY.provide, ChatRealtimeService],
  },
};

export const CHAT_PROVIDERS = { REPOSITORIES, USE_CASES };
