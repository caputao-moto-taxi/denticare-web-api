import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateConversationDto {
  @IsString()
  @MinLength(1)
  recipientId: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  subject: string;

  @IsOptional()
  @IsIn(['staff', 'patients', 'post-care'])
  category?: 'staff' | 'patients' | 'post-care';
}

export class SendMessageDto {
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  content?: string;
}

export class SocketSendMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  content: string;

  @IsString()
  @MinLength(1)
  conversationId: string;
}

export class SocketReadDto {
  @IsString()
  @MinLength(1)
  conversationId: string;
}

export class SocketTypingDto {
  @IsString()
  @MinLength(1)
  conversationId: string;

  @IsBoolean()
  isTyping: boolean;
}
