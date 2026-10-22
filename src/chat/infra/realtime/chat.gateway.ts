import {
  BadRequestException,
  HttpException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import type { Namespace, Socket } from 'socket.io';
import { AuthUser } from '../../../auth/auth-user';
import { PrismaService } from '../../../shared/infra/db/prisma/prisma.service';
import { GetConversationParticipantsUseCase } from '../../application/useCases/get-conversation-participants/get-conversation-participants-use-case';
import { MarkConversationReadUseCase } from '../../application/useCases/mark-conversation-read/mark-conversation-read-use-case';
import { SendChatMessageUseCase } from '../../application/useCases/send-chat-message/send-chat-message-use-case';
import {
  SocketReadDto,
  SocketSendMessageDto,
  SocketTypingDto,
} from '../http/controllers/dtos/chat.dto';
import { ChatRealtimeService, userRoom } from './chat-realtime.service';

interface AccessTokenPayload {
  sub: string;
  jti: string;
  exp: number;
}

interface SocketSession {
  user: AuthUser;
  jti: string;
  expiresAt: number;
  expiryTimer?: NodeJS.Timeout;
}

type Ack<T> =
  | ({ ok: true } & T)
  | { ok: false; status: number; message: string };

const SESSION_KEY = 'session';

@Injectable()
@WebSocketGateway({ namespace: '/chat', cors: { origin: '*' } })
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly sendMessageUseCase: SendChatMessageUseCase,
    private readonly markReadUseCase: MarkConversationReadUseCase,
    private readonly getParticipantsUseCase: GetConversationParticipantsUseCase,
    private readonly realtime: ChatRealtimeService,
  ) {}

  afterInit(server: Namespace) {
    this.realtime.attach(server);
  }

  async handleConnection(client: Socket) {
    try {
      const token = (client.handshake.auth as { token?: unknown } | undefined)
        ?.token;
      const session = await this.authenticate(token);
      client.data[SESSION_KEY] = session;
      await client.join(userRoom(session.user.id));

      // Tokens expire after an hour; a live socket must not outlive its token.
      session.expiryTimer = setTimeout(
        () => client.disconnect(true),
        Math.max(session.expiresAt - Date.now(), 0),
      );
    } catch {
      client.emit('chat:unauthorized');
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    const session = client.data[SESSION_KEY] as SocketSession | undefined;
    if (session?.expiryTimer) clearTimeout(session.expiryTimer);
  }

  @SubscribeMessage('chat:send')
  send(@ConnectedSocket() client: Socket, @MessageBody() body: unknown) {
    return this.handle(client, async (user) => {
      const dto = await this.parse(SocketSendMessageDto, body);
      const message = await this.sendMessageUseCase.execute({
        user,
        conversationId: dto.conversationId,
        input: { content: dto.content },
      });
      return { message };
    });
  }

  @SubscribeMessage('chat:read')
  read(@ConnectedSocket() client: Socket, @MessageBody() body: unknown) {
    return this.handle(client, async (user) => {
      const dto = await this.parse(SocketReadDto, body);
      await this.markReadUseCase.execute({
        user,
        conversationId: dto.conversationId,
      });
      return {};
    });
  }

  @SubscribeMessage('chat:typing')
  typing(@ConnectedSocket() client: Socket, @MessageBody() body: unknown) {
    return this.handle(client, async (user) => {
      const dto = await this.parse(SocketTypingDto, body);
      const { starterId, recipientId } =
        await this.getParticipantsUseCase.execute({
          user,
          conversationId: dto.conversationId,
        });
      this.realtime.typingChanged({
        conversationId: dto.conversationId,
        userId: user.id,
        isTyping: dto.isTyping,
        participantIds: [starterId, recipientId],
      });
      return {};
    });
  }

  // Revocation is re-checked per event because logout does not close sockets by itself.
  private async handle<T extends object>(
    client: Socket,
    action: (user: AuthUser) => Promise<T>,
  ): Promise<Ack<T>> {
    try {
      const session = client.data[SESSION_KEY] as SocketSession | undefined;
      if (!session || session.expiresAt <= Date.now()) {
        throw new UnauthorizedException('Session expired');
      }
      if (await this.isRevoked(session.jti)) {
        client.disconnect(true);
        throw new UnauthorizedException('Access token has been revoked');
      }
      return { ok: true, ...(await action(session.user)) };
    } catch (error) {
      if (error instanceof HttpException) {
        return {
          ok: false,
          status: error.getStatus(),
          message: error.message,
        };
      }
      this.logger.error('Unexpected chat socket failure', error as Error);
      return { ok: false, status: 500, message: 'Internal server error' };
    }
  }

  private async parse<T extends object>(
    type: new () => T,
    body: unknown,
  ): Promise<T> {
    const instance = plainToInstance(type, body);
    const errors = await validate(instance, {
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
    });
    if (errors.length > 0) {
      throw new BadRequestException(
        errors.flatMap((error) => Object.values(error.constraints ?? {})),
      );
    }
    return instance;
  }

  private async authenticate(token: unknown): Promise<SocketSession> {
    if (typeof token !== 'string' || !token) {
      throw new UnauthorizedException('Access token is required');
    }
    const payload =
      await this.jwtService.verifyAsync<AccessTokenPayload>(token);
    if (!payload.sub || !payload.jti || !payload.exp) {
      throw new UnauthorizedException('Invalid access token');
    }
    if (await this.isRevoked(payload.jti)) {
      throw new UnauthorizedException('Access token has been revoked');
    }

    const account = await this.prisma.user.findFirst({
      where: { id: payload.sub, isActive: true, deletedAt: null },
      include: { Role: true },
    });
    if (!account)
      throw new UnauthorizedException('User account is unavailable');

    return {
      user: {
        id: account.id,
        email: account.email,
        role: account.Role?.slug ?? 'staff',
        branchId: account.branchId,
      },
      jti: payload.jti,
      expiresAt: payload.exp * 1000,
    };
  }

  private async isRevoked(jti: string) {
    const revoked = await this.prisma.revokedToken.findUnique({
      where: { jti },
      select: { jti: true },
    });
    return Boolean(revoked);
  }
}
