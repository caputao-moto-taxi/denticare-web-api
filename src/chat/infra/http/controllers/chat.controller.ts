import {
  Body,
  BadRequestException,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFiles,
  UseInterceptors,
  UseGuards,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { basename } from 'path';
import { Response } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser } from '../../../../auth/auth-user';
import { CurrentUser } from '../../../../auth/current-user.decorator';
import { JwtAuthGuard } from '../../../../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../../../auth/permissions.guard';
import { RequirePermissions } from '../../../../auth/permissions';
import { ListQueryDto } from '../../../../shared/infra/http/list-query.dto';
import { CreateConversationUseCase } from '../../../application/useCases/create-conversation/create-conversation-use-case';
import { GetConversationMessagesUseCase } from '../../../application/useCases/get-conversation-messages/get-conversation-messages-use-case';
import { GetUnreadCountUseCase } from '../../../application/useCases/get-unread-count/get-unread-count-use-case';
import { ListChatContactsUseCase } from '../../../application/useCases/list-chat-contacts/list-chat-contacts-use-case';
import { ListConversationsUseCase } from '../../../application/useCases/list-conversations/list-conversations-use-case';
import { MarkConversationReadUseCase } from '../../../application/useCases/mark-conversation-read/mark-conversation-read-use-case';
import { SendChatMessageUseCase } from '../../../application/useCases/send-chat-message/send-chat-message-use-case';
import { GetChatAttachmentUseCase } from '../../../application/useCases/get-chat-attachment/get-chat-attachment-use-case';
import { CreateConversationDto, SendMessageDto } from './dtos/chat.dto';

const CHAT_ATTACHMENT_FILE_LIMIT = 5 * 1024 * 1024;
const CHAT_ATTACHMENT_COUNT_LIMIT = 5;

type ChatUpload = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

@ApiTags('Chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('chat/conversations')
export class ChatController {
  constructor(
    private readonly listConversations: ListConversationsUseCase,
    private readonly getUnreadCount: GetUnreadCountUseCase,
    private readonly listContacts: ListChatContactsUseCase,
    private readonly markConversationRead: MarkConversationReadUseCase,
    private readonly createConversation: CreateConversationUseCase,
    private readonly getMessages: GetConversationMessagesUseCase,
    private readonly sendMessage: SendChatMessageUseCase,
    private readonly getAttachment: GetChatAttachmentUseCase,
  ) {}

  @Get()
  @RequirePermissions('chat.read')
  list(@CurrentUser() user: AuthUser, @Query() query: ListQueryDto) {
    return this.listConversations.execute({ user, query });
  }

  @Get('unread-count')
  @RequirePermissions('chat.read')
  unreadCount(@CurrentUser() user: AuthUser) {
    return this.getUnreadCount.execute({ user });
  }

  @Get('contacts')
  @RequirePermissions('chat.read')
  contacts(@CurrentUser() user: AuthUser, @Query() query: ListQueryDto) {
    return this.listContacts.execute({ user, query });
  }

  @Patch(':id/read')
  @RequirePermissions('chat.read')
  markRead(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.markConversationRead.execute({ user, conversationId: id });
  }

  @Post()
  @RequirePermissions('chat.send')
  create(@CurrentUser() user: AuthUser, @Body() input: CreateConversationDto) {
    return this.createConversation.execute({ user, input });
  }

  @Get(':id/messages')
  @RequirePermissions('chat.read')
  messages(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Query() query: ListQueryDto,
  ) {
    return this.getMessages.execute({
      user,
      conversationId: id,
      query,
    });
  }

  @Get(':id/messages/:messageId/attachments/:attachmentId/file')
  @RequirePermissions('chat.read')
  async attachment(
    @CurrentUser() user: AuthUser,
    @Param('id') conversationId: string,
    @Param('messageId') messageId: string,
    @Param('attachmentId') attachmentId: string,
    @Res() response: Response,
  ) {
    const file = await this.getAttachment.execute({
      user,
      conversationId,
      messageId,
      attachmentId,
    });
    response.setHeader('Content-Type', file.mimeType);
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(file.fileName)}`,
    );
    response.setHeader('Content-Length', file.data.byteLength);
    return response.send(file.data);
  }

  @Post(':id/messages')
  @RequirePermissions('chat.send')
  @UseInterceptors(
    FilesInterceptor('files', CHAT_ATTACHMENT_COUNT_LIMIT, {
      limits: {
        fileSize: CHAT_ATTACHMENT_FILE_LIMIT,
        files: CHAT_ATTACHMENT_COUNT_LIMIT,
      },
    }),
  )
  send(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() input: SendMessageDto,
    @UploadedFiles() files?: ChatUpload[],
  ) {
    if (!input.content?.trim() && !files?.length) {
      throw new BadRequestException(
        'A message or at least one file is required',
      );
    }
    if (
      files?.some((file) => file.size === 0 || file.originalname.length > 255)
    ) {
      throw new BadRequestException(
        'Attachments must be non-empty and have a valid file name',
      );
    }
    return this.sendMessage.execute({
      user,
      conversationId: id,
      input: {
        content: input.content ?? '',
        files: files?.map((file) => ({
          ...file,
          originalname: basename(file.originalname),
        })),
      },
    });
  }
}
