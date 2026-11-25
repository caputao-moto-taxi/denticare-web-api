import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AuthUser } from '../../../auth/auth-user';
import { PatientExamStorage } from '../../../patients/infra/storage/patient-exam-storage';
import {
  ChatConversationRecord,
  ChatConversationScopeRecord,
  ChatMessageRecord,
  ChatUserRecord,
  IChatRepository,
} from '../../domain/chat.repository';
import { CreateConversationUseCase } from './create-conversation/create-conversation-use-case';
import { GetChatAttachmentUseCase } from './get-chat-attachment/get-chat-attachment-use-case';
import { GetConversationMessagesUseCase } from './get-conversation-messages/get-conversation-messages-use-case';
import { GetUnreadCountUseCase } from './get-unread-count/get-unread-count-use-case';
import { ListChatContactsUseCase } from './list-chat-contacts/list-chat-contacts-use-case';
import { ListConversationsUseCase } from './list-conversations/list-conversations-use-case';
import { MarkConversationReadUseCase } from './mark-conversation-read/mark-conversation-read-use-case';
import { SendChatMessageUseCase } from './send-chat-message/send-chat-message-use-case';
import { ChatRealtimeService } from '../../infra/realtime/chat-realtime.service';

describe('Chat application use cases', () => {
  const user: AuthUser = {
    id: 'me',
    email: 'me@example.test',
    role: 'admin',
    branchId: 'branch-1',
  };
  const other = {
    id: 'other',
    email: 'other@example.test',
    Person: [{ firstName: 'Ana', lastName: 'Costa' }],
  };
  const scope: ChatConversationScopeRecord = {
    id: 'conversation-1',
    branchId: 'branch-1',
    starterId: 'me',
    recipientId: 'other',
  };
  const userRecord: ChatUserRecord = {
    ...other,
    branchId: 'branch-1',
    isActive: true,
    deletedAt: null,
    Role: { slug: 'doctor' },
  };
  const createMessage = (
    id: string,
    authorId: string,
    createdAt: string,
    attachments: unknown = null,
  ): ChatMessageRecord => ({
    id,
    conversationId: scope.id,
    authorId,
    content: id,
    createdAt: new Date(createdAt),
    attachments,
    author:
      authorId === user.id
        ? {
            id: user.id,
            email: user.email,
            Person: [{ firstName: 'Me', lastName: 'User' }],
          }
        : other,
  });
  const lastMessage = createMessage('m3', 'other', '2026-01-03T00:00:00Z');
  const conversation: ChatConversationRecord = {
    ...scope,
    category: 'staff',
    channel: 'internal',
    subject: 'Subject',
    updatedAt: new Date('2026-01-03T00:00:00Z'),
    starterLastReadAt: new Date('2026-01-01T12:00:00Z'),
    recipientLastReadAt: null,
    starter: {
      id: user.id,
      email: user.email,
      Person: [{ firstName: 'Me', lastName: 'User' }],
    },
    recipient: other,
    // Repository query returns the latest messages newest-first.
    messages: [
      lastMessage,
      createMessage('m2', 'me', '2026-01-02T00:00:00Z'),
      createMessage('m1', 'other', '2026-01-01T00:00:00Z'),
    ],
  };
  const repository = {
    transaction: jest.fn(),
    unreadCount: jest.fn(),
    listConversations: jest.fn(),
    listContacts: jest.fn(),
    findConversation: jest.fn(),
    findUser: jest.fn(),
    createConversation: jest.fn(),
    listMessages: jest.fn(),
    createMessage: jest.fn(),
    updateConversation: jest.fn(),
    findMessageAttachments: jest.fn(),
  };
  const realtime = {
    messageCreated: jest.fn(),
    conversationRead: jest.fn(),
    conversationCreated: jest.fn(),
    typingChanged: jest.fn(),
  };
  const storage = {
    store: jest.fn(),
    delete: jest.fn(),
    get: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    repository.transaction.mockImplementation((operation) =>
      operation(repository as unknown as IChatRepository),
    );
    repository.findConversation.mockResolvedValue(scope);
    repository.findUser.mockResolvedValue(userRecord);
    repository.createConversation.mockResolvedValue(conversation);
    repository.listConversations.mockResolvedValue({
      conversations: [conversation],
      total: 1,
    });
    repository.listContacts.mockResolvedValue({
      contacts: [userRecord],
      total: 1,
    });
    repository.listMessages.mockResolvedValue({
      messages: [
        createMessage('m2', 'me', '2026-01-02T00:00:00Z'),
        createMessage('m1', 'other', '2026-01-01T00:00:00Z'),
      ],
      total: 2,
    });
    repository.createMessage.mockResolvedValue(
      createMessage('sent-1', 'me', '2026-01-03T00:00:00Z'),
    );
    repository.updateConversation.mockResolvedValue(undefined);
    repository.findMessageAttachments.mockResolvedValue({
      attachments: [
        {
          id: 'attachment-1',
          storageKey: 'chat/private-key',
          name: 'scan.png',
          mimeType: 'image/png',
          size: 4,
        },
      ],
    });
    repository.unreadCount.mockResolvedValue({ count: 3 });
    storage.store.mockResolvedValue(undefined);
    storage.delete.mockResolvedValue(undefined);
    storage.get.mockResolvedValue({
      data: Buffer.from('data'),
      mime_type: 'image/png',
    });
  });

  it('maps conversation messages oldest-first and counts unread messages from others', async () => {
    const useCase = new ListConversationsUseCase(
      repository as unknown as IChatRepository,
    );
    const result = await useCase.execute({ user });
    const [listed] = result.data;

    expect(listed.messages.map(({ id }) => id)).toEqual(['m1', 'm2', 'm3']);
    expect(listed.unreadCount).toBe(1);
    expect(repository.listConversations).toHaveBeenCalledWith(
      expect.objectContaining({
        branchId: 'branch-1',
        participantId: 'me',
        messageLimit: 50,
        skip: 0,
        take: 10,
      }),
    );
  });

  it('maps contact records in the application layer', async () => {
    const useCase = new ListChatContactsUseCase(
      repository as unknown as IChatRepository,
    );

    await expect(useCase.execute({ user })).resolves.toMatchObject({
      data: [
        {
          id: 'other',
          name: 'Ana Costa',
          email: 'other@example.test',
          role: 'doctor',
          avatar: '',
        },
      ],
      meta: { total: 1 },
    });
  });

  it('returns conversation messages oldest-first after validating participation', async () => {
    const useCase = new GetConversationMessagesUseCase(
      repository as unknown as IChatRepository,
    );

    await expect(
      useCase.execute({ user, conversationId: scope.id }),
    ).resolves.toMatchObject({
      data: [{ id: 'm1' }, { id: 'm2' }],
      meta: { total: 2 },
    });
    expect(repository.findConversation).toHaveBeenCalledWith(scope.id);
  });

  it('stores a message and read marker atomically before publishing it', async () => {
    const useCase = new SendChatMessageUseCase(
      repository as unknown as IChatRepository,
      realtime as unknown as ChatRealtimeService,
      storage as unknown as PatientExamStorage,
    );

    await expect(
      useCase.execute({
        user,
        conversationId: scope.id,
        input: { content: ' hello ' },
      }),
    ).resolves.toMatchObject({ id: 'sent-1', sender: 'me' });

    expect(repository.createMessage).toHaveBeenCalledWith({
      conversationId: scope.id,
      authorId: user.id,
      content: 'hello',
    });
    expect(repository.updateConversation).toHaveBeenCalledWith(
      scope.id,
      expect.objectContaining({
        starterLastReadAt: lastMessage.createdAt,
        updatedAt: expect.any(Date),
      }),
    );
    expect(realtime.messageCreated).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: scope.id,
        participantIds: ['me', 'other'],
      }),
    );
  });

  it('stores uploaded files before persisting private attachment metadata', async () => {
    const useCase = new SendChatMessageUseCase(
      repository as unknown as IChatRepository,
      realtime as unknown as ChatRealtimeService,
      storage as unknown as PatientExamStorage,
    );
    const file = {
      originalname: 'scan.png',
      mimetype: 'image/png',
      size: 4,
      buffer: Buffer.from('data'),
    };

    await useCase.execute({
      user,
      conversationId: scope.id,
      input: { content: '', files: [file] },
    });

    expect(storage.store).toHaveBeenCalledWith({
      id: expect.stringMatching(/^chat\//),
      data: file.buffer,
      mimeType: 'image/png',
    });
    expect(repository.createMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        content: '',
        attachments: [
          expect.objectContaining({
            id: expect.any(String),
            storageKey: expect.stringMatching(/^chat\//),
            name: 'scan.png',
            mimeType: 'image/png',
            size: 4,
          }),
        ],
      }),
    );
  });

  it('removes uploaded objects when message persistence fails', async () => {
    repository.createMessage.mockRejectedValue(
      new Error('database unavailable'),
    );
    const useCase = new SendChatMessageUseCase(
      repository as unknown as IChatRepository,
      realtime as unknown as ChatRealtimeService,
      storage as unknown as PatientExamStorage,
    );

    await expect(
      useCase.execute({
        user,
        conversationId: scope.id,
        input: {
          content: '',
          files: [
            {
              originalname: 'scan.png',
              mimetype: 'image/png',
              size: 4,
              buffer: Buffer.from('data'),
            },
          ],
        },
      }),
    ).rejects.toThrow('database unavailable');
    expect(storage.delete).toHaveBeenCalledWith(
      expect.stringMatching(/^chat\//),
    );
    expect(realtime.messageCreated).not.toHaveBeenCalled();
  });

  it('does not send a message when the user is not a conversation participant', async () => {
    repository.findConversation.mockResolvedValue({
      ...scope,
      branchId: 'another-branch',
    });
    const useCase = new SendChatMessageUseCase(
      repository as unknown as IChatRepository,
      realtime as unknown as ChatRealtimeService,
      storage as unknown as PatientExamStorage,
    );

    await expect(
      useCase.execute({
        user,
        conversationId: scope.id,
        input: { content: 'hello' },
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(storage.store).not.toHaveBeenCalled();
    expect(repository.createMessage).not.toHaveBeenCalled();
  });

  it('writes the caller read marker and syncs it to the caller sessions', async () => {
    repository.findConversation.mockResolvedValue({
      ...scope,
      starterId: 'other',
      recipientId: user.id,
    });
    const useCase = new MarkConversationReadUseCase(
      repository as unknown as IChatRepository,
      realtime as unknown as ChatRealtimeService,
    );

    await expect(
      useCase.execute({ user, conversationId: scope.id }),
    ).resolves.toEqual({ id: scope.id, unreadCount: 0 });
    expect(repository.updateConversation).toHaveBeenCalledWith(
      scope.id,
      expect.objectContaining({ recipientLastReadAt: expect.any(Date) }),
    );
    expect(realtime.conversationRead).toHaveBeenCalledWith(user.id, scope.id);
  });

  it('creates a conversation after validating the recipient and trimming the subject', async () => {
    const useCase = new CreateConversationUseCase(
      repository as unknown as IChatRepository,
      realtime as unknown as ChatRealtimeService,
    );

    await expect(
      useCase.execute({
        user,
        input: {
          recipientId: 'other',
          subject: '  Help  ',
        },
      }),
    ).resolves.toMatchObject({
      id: scope.id,
      subject: 'Subject',
      contact: { id: 'other', name: 'Ana Costa' },
    });
    expect(repository.createConversation).toHaveBeenCalledWith({
      branchId: 'branch-1',
      starterId: 'me',
      recipientId: 'other',
      subject: 'Help',
      category: 'staff',
    });
    expect(realtime.conversationCreated).toHaveBeenCalledWith(
      'other',
      scope.id,
    );
  });

  it('rejects a conversation with the same participant', async () => {
    const useCase = new CreateConversationUseCase(
      repository as unknown as IChatRepository,
      realtime as unknown as ChatRealtimeService,
    );

    await expect(
      useCase.execute({
        user,
        input: { recipientId: user.id, subject: 'Help' },
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(repository.findUser).not.toHaveBeenCalled();
  });

  it('retrieves an attachment only after checking conversation participation', async () => {
    const useCase = new GetChatAttachmentUseCase(
      repository as unknown as IChatRepository,
      storage as unknown as PatientExamStorage,
    );

    await expect(
      useCase.execute({
        user,
        conversationId: scope.id,
        messageId: 'message-1',
        attachmentId: 'attachment-1',
      }),
    ).resolves.toMatchObject({
      data: Buffer.from('data'),
      mimeType: 'image/png',
      fileName: 'scan.png',
    });
    expect(repository.findMessageAttachments).toHaveBeenCalledWith(
      scope.id,
      'message-1',
    );
  });

  it('does not access attachment storage for a non-participant', async () => {
    repository.findConversation.mockResolvedValue(null);
    const useCase = new GetChatAttachmentUseCase(
      repository as unknown as IChatRepository,
      storage as unknown as PatientExamStorage,
    );

    await expect(
      useCase.execute({
        user,
        conversationId: scope.id,
        messageId: 'message-1',
        attachmentId: 'attachment-1',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(storage.get).not.toHaveBeenCalled();
  });

  it('returns the current user unread message count', async () => {
    const useCase = new GetUnreadCountUseCase(
      repository as unknown as IChatRepository,
    );

    await expect(useCase.execute({ user })).resolves.toEqual({ count: 3 });
    expect(repository.unreadCount).toHaveBeenCalledWith({
      userId: user.id,
      branchId: user.branchId,
    });
  });
});
