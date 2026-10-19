import { AuthUser } from '../../../../auth/auth-user';
import { PrismaService } from '../../../../shared/infra/db/prisma/prisma.service';
import { ChatPrismaRepository } from './chat-prisma.repository';

describe('ChatPrismaRepository', () => {
  const me: AuthUser = {
    id: 'me',
    email: 'me@example.test',
    role: 'admin',
    branchId: 'branch-1',
  };
  const person = { Person: [{ firstName: 'Ana', lastName: 'Costa' }] };
  const message = (id: string, authorId: string, createdAt: string) => ({
    id,
    authorId,
    content: id,
    createdAt: new Date(createdAt),
    author: { email: `${authorId}@example.test`, ...person },
  });
  const conversation = {
    id: 'conversation-1',
    starterId: 'me',
    recipientId: 'other',
    category: 'staff',
    channel: 'internal',
    subject: 'Subject',
    updatedAt: new Date('2026-01-03T00:00:00Z'),
    starterLastReadAt: new Date('2026-01-01T12:00:00Z'),
    recipientLastReadAt: null,
    starter: { email: 'me@example.test', ...person },
    recipient: { email: 'other@example.test', ...person },
    // Fetched newest-first.
    messages: [
      message('m3', 'other', '2026-01-03T00:00:00Z'),
      message('m2', 'me', '2026-01-02T00:00:00Z'),
      message('m1', 'other', '2026-01-01T00:00:00Z'),
    ],
  };

  const chatConversation = {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  };
  const chatMessage = { create: jest.fn(), findFirst: jest.fn() };
  const user = { findMany: jest.fn(), count: jest.fn() };
  const queryRaw = jest.fn();
  const prisma = {
    chatConversation,
    chatMessage,
    user,
    $queryRaw: queryRaw,
    $transaction: jest.fn((callback: (tx: unknown) => unknown) =>
      callback({ chatConversation, chatMessage }),
    ),
  } as unknown as PrismaService;
  const repository = new ChatPrismaRepository(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.$transaction as jest.Mock).mockImplementation(
      (operation: Promise<unknown>[] | ((tx: unknown) => unknown)) =>
        Array.isArray(operation)
          ? Promise.all(operation)
          : operation({ chatConversation, chatMessage }),
    );
    chatConversation.count.mockResolvedValue(1);
    user.count.mockResolvedValue(1);
  });

  it('returns messages oldest-first and counts only unread messages from others', async () => {
    chatConversation.findMany.mockResolvedValue([conversation]);

    const {
      data: [result],
    } = await repository.list(me);

    expect(result.messages.map((item) => item.id)).toEqual(['m1', 'm2', 'm3']);
    // m1 predates the last read marker, m2 is mine, only m3 is unread.
    expect(result.unreadCount).toBe(1);
  });

  it('returns the unread count across all conversations', async () => {
    queryRaw.mockResolvedValue([{ count: 4 }]);

    await expect(repository.unreadCount(me)).resolves.toEqual({ count: 4 });
    expect(queryRaw).toHaveBeenCalledTimes(1);
  });

  it('stores the read marker in the caller column', async () => {
    chatConversation.findFirst.mockResolvedValue({
      id: 'conversation-1',
      starterId: 'other',
    });

    await repository.markRead(me, 'conversation-1');

    expect(chatConversation.update).toHaveBeenCalledWith({
      where: { id: 'conversation-1' },
      data: { recipientLastReadAt: expect.any(Date) },
    });
  });

  it('marks the thread as read for the sender when a message is sent', async () => {
    const createdAt = new Date('2026-01-04T00:00:00Z');
    chatConversation.findFirst.mockResolvedValue({
      id: 'conversation-1',
      starterId: 'me',
    });
    chatMessage.create.mockResolvedValue({
      ...message('m4', 'me', createdAt.toISOString()),
    });

    await repository.send(me, 'conversation-1', { content: ' hello ' });

    expect(chatMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ content: 'hello' }),
      }),
    );
    expect(chatConversation.update).toHaveBeenCalledWith({
      where: { id: 'conversation-1' },
      data: { updatedAt: expect.any(Date), starterLastReadAt: createdAt },
    });
  });

  it('returns an attachment only after confirming conversation participation', async () => {
    chatConversation.findFirst.mockResolvedValue({
      id: 'conversation-1',
      starterId: 'me',
      recipientId: 'other',
    });
    chatMessage.findFirst.mockResolvedValue({
      attachments: [
        {
          id: 'attachment-1',
          storageKey: 'chat/private-key',
          name: 'scan.png',
          mimeType: 'image/png',
          size: 10,
        },
      ],
    });

    await expect(
      repository.getAttachment(
        me,
        'conversation-1',
        'message-1',
        'attachment-1',
      ),
    ).resolves.toEqual({
      storageKey: 'chat/private-key',
      name: 'scan.png',
      mimeType: 'image/png',
    });
    expect(chatConversation.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'conversation-1',
          branchId: 'branch-1',
          OR: [{ starterId: 'me' }, { recipientId: 'me' }],
        }),
      }),
    );
  });

  it('does not look up files for users outside the conversation', async () => {
    chatConversation.findFirst.mockResolvedValue(null);

    await expect(
      repository.getAttachment(
        me,
        'conversation-1',
        'message-1',
        'attachment-1',
      ),
    ).rejects.toThrow('Conversation not found');
    expect(chatMessage.findFirst).not.toHaveBeenCalled();
  });

  it('lists only active users of the same branch as contacts', async () => {
    user.findMany.mockResolvedValue([
      {
        id: 'other',
        email: 'other@example.test',
        Role: { slug: 'doctor' },
        ...person,
      },
    ]);

    await expect(repository.contacts(me)).resolves.toMatchObject({
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
    expect(user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          branchId: 'branch-1',
          id: { not: 'me' },
          isActive: true,
          deletedAt: null,
          createdAt: {},
        },
      }),
    );
  });
});
