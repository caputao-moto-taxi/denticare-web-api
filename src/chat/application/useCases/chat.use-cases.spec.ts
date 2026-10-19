import { AuthUser } from '../../../auth/auth-user';
import { IChatRepository } from '../../domain/chat.repository';
import { ChatRealtimeService } from '../../infra/realtime/chat-realtime.service';
import { CreateConversationUseCase } from './create-conversation/create-conversation-use-case';
import { GetUnreadCountUseCase } from './get-unread-count/get-unread-count-use-case';
import { MarkConversationReadUseCase } from './mark-conversation-read/mark-conversation-read-use-case';
import { SendChatMessageUseCase } from './send-chat-message/send-chat-message-use-case';

describe('Chat application use cases', () => {
  const user: AuthUser = {
    id: 'author',
    email: 'author@example.test',
    role: 'admin',
    branchId: 'branch-1',
  };
  const repository = {
    send: jest.fn(),
    participants: jest.fn(),
    markRead: jest.fn(),
    create: jest.fn(),
    unreadCount: jest.fn(),
  };
  const realtime = {
    messageCreated: jest.fn(),
    conversationRead: jest.fn(),
    conversationCreated: jest.fn(),
    typingChanged: jest.fn(),
  };
  const storage = { store: jest.fn(), delete: jest.fn() };
  const sendMessage = new SendChatMessageUseCase(
    repository as unknown as IChatRepository,
    realtime as unknown as ChatRealtimeService,
    storage as never,
  );
  const markRead = new MarkConversationReadUseCase(
    repository as unknown as IChatRepository,
    realtime as unknown as ChatRealtimeService,
  );
  const createConversation = new CreateConversationUseCase(
    repository as unknown as IChatRepository,
    realtime as unknown as ChatRealtimeService,
  );
  const getUnreadCount = new GetUnreadCountUseCase(
    repository as unknown as IChatRepository,
  );

  beforeEach(() => jest.clearAllMocks());

  it('publishes a sent message to both participants', async () => {
    const message = { id: 'm1', sender: 'me', text: 'hi', sentAt: 'now' };
    repository.send.mockResolvedValue(message);
    repository.participants.mockResolvedValue({
      starterId: 'author',
      recipientId: 'other',
    });

    await expect(
      sendMessage.execute({
        user,
        conversationId: 'c1',
        input: { content: 'hi' },
      }),
    ).resolves.toBe(message);
    expect(realtime.messageCreated).toHaveBeenCalledWith({
      conversationId: 'c1',
      message,
      authorId: 'author',
      participantIds: ['author', 'other'],
    });
    expect(realtime.typingChanged).toHaveBeenCalledWith({
      conversationId: 'c1',
      userId: 'author',
      isTyping: false,
      participantIds: ['author', 'other'],
    });
  });

  it('does not publish when the message could not be stored', async () => {
    repository.participants.mockResolvedValue({
      starterId: 'author',
      recipientId: 'other',
    });
    repository.send.mockRejectedValue(new Error('not a participant'));

    await expect(
      sendMessage.execute({
        user,
        conversationId: 'c1',
        input: { content: 'hi' },
      }),
    ).rejects.toThrow('not a participant');
    expect(realtime.messageCreated).not.toHaveBeenCalled();
  });

  it('stores uploaded files before creating a message with private metadata', async () => {
    const message = { id: 'm2', sender: 'me', text: '', sentAt: 'now' };
    repository.participants.mockResolvedValue({
      starterId: 'author',
      recipientId: 'other',
    });
    repository.send.mockResolvedValue(message);
    const file = {
      originalname: 'scan.png',
      mimetype: 'image/png',
      size: 4,
      buffer: Buffer.from('data'),
    };

    await sendMessage.execute({
      user,
      conversationId: 'c1',
      input: { content: '', files: [file] },
    });

    expect(storage.store).toHaveBeenCalledWith({
      id: expect.stringMatching(/^chat\//),
      data: file.buffer,
      mimeType: 'image/png',
    });
    expect(repository.send).toHaveBeenCalledWith(
      user,
      'c1',
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

  it('deletes uploaded objects when message persistence fails', async () => {
    repository.participants.mockResolvedValue({
      starterId: 'author',
      recipientId: 'other',
    });
    repository.send.mockRejectedValue(new Error('database unavailable'));

    await expect(
      sendMessage.execute({
        user,
        conversationId: 'c1',
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
  });

  it('syncs the read state to the user sessions', async () => {
    repository.markRead.mockResolvedValue({ id: 'c1', unreadCount: 0 });

    await markRead.execute({ user, conversationId: 'c1' });

    expect(realtime.conversationRead).toHaveBeenCalledWith('author', 'c1');
  });

  it('tells the recipient about a new conversation', async () => {
    repository.create.mockResolvedValue({ id: 'c9' });

    await createConversation.execute({
      user,
      input: { recipientId: 'other', subject: 'Hello' },
    });

    expect(realtime.conversationCreated).toHaveBeenCalledWith('other', 'c9');
  });

  it('returns the current user unread message count', async () => {
    repository.unreadCount.mockResolvedValue({ count: 3 });

    await expect(getUnreadCount.execute({ user })).resolves.toEqual({
      count: 3,
    });
    expect(repository.unreadCount).toHaveBeenCalledWith(user);
  });
});
