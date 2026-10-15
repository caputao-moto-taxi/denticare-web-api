import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser } from '../../../../auth/auth-user';
import { CurrentUser } from '../../../../auth/current-user.decorator';
import { JwtAuthGuard } from '../../../../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../../../auth/permissions.guard';
import { RequirePermissions } from '../../../../auth/permissions';
import { ListQueryDto } from '../../../../shared/infra/http/list-query.dto';
import { ChatUseCases } from '../../../application/useCases/chat.use-cases';
import { CreateConversationDto, SendMessageDto } from './dtos/chat.dto';

@ApiTags('Chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('chat/conversations')
export class ChatController {
  constructor(private readonly chatService: ChatUseCases) {}

  @Get()
  @RequirePermissions('chat.read')
  list(@CurrentUser() user: AuthUser, @Query() query: ListQueryDto) {
    return this.chatService.list(user, query);
  }

  @Get('unread-count')
  @RequirePermissions('chat.read')
  unreadCount(@CurrentUser() user: AuthUser) {
    return this.chatService.unreadCount(user);
  }

  @Get('contacts')
  @RequirePermissions('chat.read')
  contacts(@CurrentUser() user: AuthUser, @Query() query: ListQueryDto) {
    return this.chatService.contacts(user, query);
  }

  @Patch(':id/read')
  @RequirePermissions('chat.read')
  markRead(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.chatService.markRead(user, id);
  }

  @Post()
  @RequirePermissions('chat.send')
  create(@CurrentUser() user: AuthUser, @Body() input: CreateConversationDto) {
    return this.chatService.create(user, input);
  }

  @Get(':id/messages')
  @RequirePermissions('chat.read')
  messages(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Query() query: ListQueryDto,
  ) {
    return this.chatService.messages(user, id, query);
  }

  @Post(':id/messages')
  @RequirePermissions('chat.send')
  send(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() input: SendMessageDto,
  ) {
    return this.chatService.send(user, id, input);
  }
}
