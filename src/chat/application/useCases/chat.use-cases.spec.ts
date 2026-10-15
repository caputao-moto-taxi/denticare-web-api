import { AuthUser } from '../../../auth/auth-user';
import { IChatRepository } from '../../domain/chat.repository';
import { ChatRealtimeService } from '../../infra/realtime/chat-realtime.service';
import { ChatUseCases } from './chat.use-cases';

describe('ChatUseCases', () => {
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
  const useCases = new ChatUseCases(
    repository as unknown as IChatRepository,
    realtime as unknown as ChatRealtimeService,
  );

  beforeEach(() => jest.clearAllMocks());

  it('publishes a sent message to both participants', async () => {
    const message = { id: 'm1', sender: 'me', text: 'hi', sentAt: 'now' };
    repository.send.mockResolvedValue(message);
    repository.participants.mockResolvedValue({
      starterId: 'author',
      recipientId: 'other',
    });

    await expect(useCases.send(user, 'c1', { content: 'hi' })).resolves.toBe(
      message,
    );
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
    repository.send.mockRejectedValue(new Error('not a participant'));

    await expect(useCases.send(user, 'c1', { content: 'hi' })).rejects.toThrow(
      'not a participant',
    );
    expect(realtime.messageCreated).not.toHaveBeenCalled();
  });

  it('syncs the read state to the user sessions', async () => {
    repository.markRead.mockResolvedValue({ id: 'c1', unreadCount: 0 });

    await useCases.markRead(user, 'c1');

    expect(realtime.conversationRead).toHaveBeenCalledWith('author', 'c1');
  });

  it('tells the recipient about a new conversation', async () => {
    repository.create.mockResolvedValue({ id: 'c9' });

    await useCases.create(user, { recipientId: 'other', subject: 'Hello' });

    expect(realtime.conversationCreated).toHaveBeenCalledWith('other', 'c9');
  });

  it('returns the current user unread message count', async () => {
    repository.unreadCount.mockResolvedValue({ count: 3 });

    await expect(useCases.unreadCount(user)).resolves.toEqual({ count: 3 });
    expect(repository.unreadCount).toHaveBeenCalledWith(user);
  });
});
