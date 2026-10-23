import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsIn,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class AssistantChatMessageDto {
  @IsIn(['user', 'assistant'])
  role: 'user' | 'assistant';

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  content: string;
}

export class AssistantChatDto {
  @ValidateNested({ each: true })
  @Type(() => AssistantChatMessageDto)
  @ArrayMinSize(1)
  @ArrayMaxSize(16)
  messages: AssistantChatMessageDto[];
}
