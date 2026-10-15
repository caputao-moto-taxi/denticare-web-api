import { JwtService } from '@nestjs/jwt';
import type { Socket } from 'socket.io';
import { PrismaService } from '../../../shared/infra/db/prisma/prisma.service';
import { ChatUseCases } from '../../application/useCases/chat.use-cases';
import { ChatGateway } from './chat.gateway';
import { ChatRealtimeService } from './chat-realtime.service';

describe('ChatGateway', () => {
  const jwt = { verifyAsync: jest.fn() };
  const prisma = {
    user: { findFirst: jest.fn() },
    revokedToken: { findUnique: jest.fn() },
  };
  const chat = {
    send: jest.fn(),
    markRead: jest.fn(),
    participants: jest.fn(),
  };
  const realtime = { attach: jest.fn(), typingChanged: jest.fn() };
  const gateway = new ChatGateway(
    jwt as unknown as JwtService,
    prisma as unknown as PrismaService,
    chat as unknown as ChatUseCases,
    realtime as unknown as ChatRealtimeService,
  );

  const exp = Math.floor(Date.now() / 1000) + 3600;
  const makeSocket = (token?: unknown) =>
    ({
      handshake: { auth: { token } },
      data: {} as Record<string, unknown>,
      join: jest.fn().mockResolvedValue(undefined),
      emit: jest.fn(),
      disconnect: jest.fn(),
    }) as unknown as Socket & {
      join: jest.Mock;
      emit: jest.Mock;
      disconnect: jest.Mock;
    };

  const connect = async (token = 'valid') => {
    jwt.verifyAsync.mockResolvedValue({ sub: 'user-1', jti: 'jti-1', exp });
    prisma.revokedToken.findUnique.mockResolvedValue(null);
    prisma.user.findFirst.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.test',
      branchId: 'branch-1',
      Role: { slug: 'nurse' },
    });
    const socket = makeSocket(token);
    await gateway.handleConnection(socket);
    return socket;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('attaches the namespace to the realtime service', () => {
    const namespace = {} as never;

    gateway.afterInit(namespace);

    expect(realtime.attach).toHaveBeenCalledWith(namespace);
  });

  it('rejects sockets without a token', async () => {
    const socket = makeSocket(undefined);

    await gateway.handleConnection(socket);

    expect(socket.disconnect).toHaveBeenCalledWith(true);
    expect(socket.join).not.toHaveBeenCalled();
  });

  it('rejects revoked tokens', async () => {
    jwt.verifyAsync.mockResolvedValue({ sub: 'user-1', jti: 'jti-1', exp });
    prisma.revokedToken.findUnique.mockResolvedValue({ jti: 'jti-1' });
    const socket = makeSocket('revoked');

    await gateway.handleConnection(socket);

    expect(socket.disconnect).toHaveBeenCalledWith(true);
  });

  it('puts authenticated users in their private room', async () => {
    const socket = await connect();

    expect(socket.join).toHaveBeenCalledWith('user:user-1');
    expect(socket.disconnect).not.toHaveBeenCalled();
    gateway.handleDisconnect(socket);
  });

  it('closes the socket when the token expires', async () => {
    const socket = await connect();

    jest.advanceTimersByTime(3600 * 1000 + 1);

    expect(socket.disconnect).toHaveBeenCalledWith(true);
  });

  it('sends messages as the authenticated user and acknowledges them', async () => {
    const socket = await connect();
    chat.send.mockResolvedValue({ id: 'm1', sender: 'me' });

    await expect(
      gateway.send(socket, { conversationId: 'c1', content: 'hi' }),
    ).resolves.toEqual({ ok: true, message: { id: 'm1', sender: 'me' } });
    expect(chat.send).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'user-1', branchId: 'branch-1' }),
      'c1',
      { content: 'hi' },
    );
    gateway.handleDisconnect(socket);
  });

  it('broadcasts typing only to conversation participants', async () => {
    const socket = await connect();
    chat.participants.mockResolvedValue({
      starterId: 'user-1',
      recipientId: 'user-2',
    });

    await expect(
      gateway.typing(socket, { conversationId: 'c1', isTyping: true }),
    ).resolves.toEqual({ ok: true });
    expect(chat.participants).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'user-1' }),
      'c1',
    );
    expect(realtime.typingChanged).toHaveBeenCalledWith({
      conversationId: 'c1',
      userId: 'user-1',
      isTyping: true,
      participantIds: ['user-1', 'user-2'],
    });
    gateway.handleDisconnect(socket);
  });

  it('rejects invalid typing payloads', async () => {
    const socket = await connect();

    await expect(
      gateway.typing(socket, { conversationId: 'c1', isTyping: 'yes' }),
    ).resolves.toMatchObject({ ok: false, status: 400 });
    expect(chat.participants).not.toHaveBeenCalled();
    expect(realtime.typingChanged).not.toHaveBeenCalled();
    gateway.handleDisconnect(socket);
  });

  it('rejects invalid payloads without calling the use case', async () => {
    const socket = await connect();

    const ack = await gateway.send(socket, { conversationId: 'c1', extra: 1 });

    expect(ack).toMatchObject({ ok: false, status: 400 });
    expect(chat.send).not.toHaveBeenCalled();
    gateway.handleDisconnect(socket);
  });

  it('refuses events from unauthenticated sockets', async () => {
    const socket = makeSocket();

    await expect(
      gateway.send(socket, { conversationId: 'c1', content: 'hi' }),
    ).resolves.toMatchObject({ ok: false, status: 401 });
    expect(chat.send).not.toHaveBeenCalled();
  });

  it('drops the socket when the token was revoked after connecting', async () => {
    const socket = await connect();
    prisma.revokedToken.findUnique.mockResolvedValue({ jti: 'jti-1' });

    await expect(
      gateway.read(socket, { conversationId: 'c1' }),
    ).resolves.toMatchObject({ ok: false, status: 401 });
    expect(socket.disconnect).toHaveBeenCalledWith(true);
    expect(chat.markRead).not.toHaveBeenCalled();
    gateway.handleDisconnect(socket);
  });
});
