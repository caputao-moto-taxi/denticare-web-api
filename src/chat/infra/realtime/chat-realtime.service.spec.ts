import type { Namespace } from 'socket.io';
import { ChatMessageView } from '../../domain/chat.repository';
import { ChatRealtimeService } from './chat-realtime.service';

describe('ChatRealtimeService', () => {
  const emit = jest.fn();
  const to = jest.fn(() => ({ emit }));
  const service = new ChatRealtimeService();
  const message: ChatMessageView = {
    id: 'm1',
    sender: 'me',
    text: 'hello',
    sentAt: '2026-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service.attach({ to } as unknown as Namespace);
  });

  it('delivers a message to each participant from their own point of view', () => {
    service.messageCreated({
      conversationId: 'c1',
      message,
      authorId: 'author',
      participantIds: ['author', 'other'],
    });

    expect(to).toHaveBeenNthCalledWith(1, 'user:author');
    expect(emit).toHaveBeenNthCalledWith(1, 'chat:message', {
      conversationId: 'c1',
      message: { ...message, sender: 'me' },
    });
    expect(to).toHaveBeenNthCalledWith(2, 'user:other');
    expect(emit).toHaveBeenNthCalledWith(2, 'chat:message', {
      conversationId: 'c1',
      message: { ...message, sender: 'contact' },
    });
  });

  it('never reaches users outside the conversation', () => {
    service.messageCreated({
      conversationId: 'c1',
      message,
      authorId: 'author',
      participantIds: ['author', 'author'],
    });

    expect(to).toHaveBeenCalledTimes(1);
    expect(to).toHaveBeenCalledWith('user:author');
  });

  it('notifies a new recipient and the reader sessions', () => {
    service.conversationCreated('recipient', 'c1');
    service.conversationRead('reader', 'c1');

    expect(to).toHaveBeenCalledWith('user:recipient');
    expect(emit).toHaveBeenCalledWith('chat:conversation', {
      conversationId: 'c1',
    });
    expect(to).toHaveBeenCalledWith('user:reader');
    expect(emit).toHaveBeenCalledWith('chat:read', { conversationId: 'c1' });
  });

  it('sends typing updates to the other participant only', () => {
    service.typingChanged({
      conversationId: 'c1',
      userId: 'author',
      isTyping: true,
      participantIds: ['author', 'other'],
    });

    expect(to).toHaveBeenCalledTimes(1);
    expect(to).toHaveBeenCalledWith('user:other');
    expect(emit).toHaveBeenCalledWith('chat:typing', {
      conversationId: 'c1',
      userId: 'author',
      isTyping: true,
    });
  });

  it('ignores events before the namespace is attached', () => {
    const detached = new ChatRealtimeService();

    expect(() => detached.conversationRead('reader', 'c1')).not.toThrow();
  });
});
