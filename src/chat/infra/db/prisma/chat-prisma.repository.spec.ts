import { PrismaService } from '../../../../shared/infra/db/prisma/prisma.service';
import { ChatPrismaRepository } from './chat-prisma.repository';

describe('ChatPrismaRepository', () => {
  const chatConversation = {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  };
  const chatMessage = {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
  };
  const user = { findMany: jest.fn(), findUnique: jest.fn(), count: jest.fn() };
  const prisma = {
    chatConversation,
    chatMessage,
    user,
    $transaction: jest.fn(),
  } as unknown as PrismaService;
  const repository = new ChatPrismaRepository(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.$transaction as jest.Mock).mockImplementation(
      (operations: Promise<unknown>[]) => Promise.all(operations),
    );
  });

  it('maps conversation criteria to database filters, includes and pagination', async () => {
    chatConversation.findMany.mockResolvedValue([]);
    chatConversation.count.mockResolvedValue(0);
    const updatedAtFrom = new Date('2026-01-01T00:00:00.000Z');
    const updatedAtToExclusive = new Date('2026-02-01T00:00:00.000Z');

    await expect(
      repository.listConversations({
        branchId: 'branch-1',
        participantId: 'me',
        category: 'staff',
        updatedAtFrom,
        updatedAtToExclusive,
        search: 'Ana',
        skip: 10,
        take: 10,
        messageLimit: 50,
      }),
    ).resolves.toEqual({ conversations: [], total: 0 });

    expect(chatConversation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          branchId: 'branch-1',
          OR: [{ starterId: 'me' }, { recipientId: 'me' }],
          category: 'staff',
          updatedAt: { gte: updatedAtFrom, lt: updatedAtToExclusive },
          AND: expect.any(Array),
        }),
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
        skip: 10,
        take: 10,
        include: expect.objectContaining({
          messages: expect.objectContaining({
            orderBy: { createdAt: 'desc' },
            take: 50,
          }),
        }),
      }),
    );
    expect(chatConversation.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        branchId: 'branch-1',
        category: 'staff',
      }),
    });
  });

  it('queries active branch contacts without mapping them into API views', async () => {
    const contact = {
      id: 'contact-1',
      branchId: 'branch-1',
      isActive: true,
      deletedAt: null,
      email: 'contact@example.test',
      Person: [{ firstName: 'Ana', lastName: 'Costa' }],
      Role: { slug: 'doctor' },
    };
    user.findMany.mockResolvedValue([contact]);
    user.count.mockResolvedValue(1);

    await expect(
      repository.listContacts({
        branchId: 'branch-1',
        excludedUserId: 'me',
        role: 'doctor',
        skip: 0,
        take: 10,
      }),
    ).resolves.toEqual({ contacts: [contact], total: 1 });
    expect(user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          branchId: 'branch-1',
          id: { not: 'me' },
          isActive: true,
          deletedAt: null,
          Role: { slug: 'doctor' },
        },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        skip: 0,
        take: 10,
      }),
    );
  });

  it('looks up conversation scope by identifier without applying participant policy', async () => {
    const scope = {
      id: 'conversation-1',
      branchId: 'branch-1',
      starterId: 'me',
      recipientId: 'other',
    };
    chatConversation.findUnique.mockResolvedValue(scope);

    await expect(
      repository.findConversation('conversation-1'),
    ).resolves.toEqual(scope);
    expect(chatConversation.findUnique).toHaveBeenCalledWith({
      where: { id: 'conversation-1' },
      select: {
        id: true,
        branchId: true,
        starterId: true,
        recipientId: true,
      },
    });
  });

  it('returns message rows newest-first for application-level ordering', async () => {
    chatMessage.findMany.mockResolvedValue([]);
    chatMessage.count.mockResolvedValue(0);

    await repository.listMessages({
      conversationId: 'conversation-1',
      skip: 0,
      take: 10,
    });

    expect(chatMessage.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { conversationId: 'conversation-1' },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: 0,
        take: 10,
      }),
    );
  });
});
