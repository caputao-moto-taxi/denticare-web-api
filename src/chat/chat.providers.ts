import { PrismaService } from '../shared/infra/db/prisma/prisma.service';
import { PatientExamStorage } from '../patients/infra/storage/patient-exam-storage';
import { CreateConversationUseCase } from './application/useCases/create-conversation/create-conversation-use-case';
import { GetConversationMessagesUseCase } from './application/useCases/get-conversation-messages/get-conversation-messages-use-case';
import { GetChatAttachmentUseCase } from './application/useCases/get-chat-attachment/get-chat-attachment-use-case';
import { GetConversationParticipantsUseCase } from './application/useCases/get-conversation-participants/get-conversation-participants-use-case';
import { GetUnreadCountUseCase } from './application/useCases/get-unread-count/get-unread-count-use-case';
import { ListChatContactsUseCase } from './application/useCases/list-chat-contacts/list-chat-contacts-use-case';
import { ListConversationsUseCase } from './application/useCases/list-conversations/list-conversations-use-case';
import { MarkConversationReadUseCase } from './application/useCases/mark-conversation-read/mark-conversation-read-use-case';
import { SendChatMessageUseCase } from './application/useCases/send-chat-message/send-chat-message-use-case';
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
  LIST_CONVERSATIONS: {
    provide: ListConversationsUseCase,
    useFactory: (repository: IChatRepository) =>
      new ListConversationsUseCase(repository),
    inject: [REPOSITORIES.CHAT_REPOSITORY.provide],
  },
  GET_UNREAD_COUNT: {
    provide: GetUnreadCountUseCase,
    useFactory: (repository: IChatRepository) =>
      new GetUnreadCountUseCase(repository),
    inject: [REPOSITORIES.CHAT_REPOSITORY.provide],
  },
  LIST_CONTACTS: {
    provide: ListChatContactsUseCase,
    useFactory: (repository: IChatRepository) =>
      new ListChatContactsUseCase(repository),
    inject: [REPOSITORIES.CHAT_REPOSITORY.provide],
  },
  MARK_READ: {
    provide: MarkConversationReadUseCase,
    useFactory: (repository: IChatRepository, realtime: ChatRealtimeService) =>
      new MarkConversationReadUseCase(repository, realtime),
    inject: [REPOSITORIES.CHAT_REPOSITORY.provide, ChatRealtimeService],
  },
  CREATE_CONVERSATION: {
    provide: CreateConversationUseCase,
    useFactory: (repository: IChatRepository, realtime: ChatRealtimeService) =>
      new CreateConversationUseCase(repository, realtime),
    inject: [REPOSITORIES.CHAT_REPOSITORY.provide, ChatRealtimeService],
  },
  GET_MESSAGES: {
    provide: GetConversationMessagesUseCase,
    useFactory: (repository: IChatRepository) =>
      new GetConversationMessagesUseCase(repository),
    inject: [REPOSITORIES.CHAT_REPOSITORY.provide],
  },
  GET_ATTACHMENT: {
    provide: GetChatAttachmentUseCase,
    useFactory: (repository: IChatRepository, storage: PatientExamStorage) =>
      new GetChatAttachmentUseCase(repository, storage),
    inject: [REPOSITORIES.CHAT_REPOSITORY.provide, PatientExamStorage],
  },
  GET_PARTICIPANTS: {
    provide: GetConversationParticipantsUseCase,
    useFactory: (repository: IChatRepository) =>
      new GetConversationParticipantsUseCase(repository),
    inject: [REPOSITORIES.CHAT_REPOSITORY.provide],
  },
  SEND_MESSAGE: {
    provide: SendChatMessageUseCase,
    useFactory: (
      repository: IChatRepository,
      realtime: ChatRealtimeService,
      storage: PatientExamStorage,
    ) => new SendChatMessageUseCase(repository, realtime, storage),
    inject: [
      REPOSITORIES.CHAT_REPOSITORY.provide,
      ChatRealtimeService,
      PatientExamStorage,
    ],
  },
};

export const CHAT_PROVIDERS = { REPOSITORIES, USE_CASES };
