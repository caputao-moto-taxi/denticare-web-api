import { ApiProperty } from "@nestjs/swagger";
import {
  Allow,
  IsEmpty,
  IsNotEmpty,
  IsOptional,
  IsString,
} from "class-validator";

export class FindLogsByNotificationAndTimestampDto {
  @IsString()
  @IsNotEmpty()
  @Allow()
  @ApiProperty({
    example: "0c1d930d-f2f1-4b41-91cd-edb39ff608a7",
    description: "The ID of the notification",
    required: true,
    type: "string",
    format: "uuid",
  })
  notificationId: string;

  @IsString()
  @IsEmpty()
  @Allow()
  @IsOptional()
  @ApiProperty({
    example: "2023-10-01T12:00:00Z",
    description: "The timestamp of the log",
    required: true,
    type: "string",
    format: "date-time",
  })
  timestamp?: Date;
}

export class FindLogsByApplicationAndTimestampDto {
  @IsString()
  @IsNotEmpty()
  @Allow()
  @ApiProperty({
    example: "0c1d930d-f2f1-4b41-91cd-edb39ff608a7",
    description: "The ID of the application",
    required: true,
    type: "string",
    format: "uuid",
  })
  applicationId: string;

  @IsString()
  @IsEmpty()
  @Allow()
  @IsOptional()
  @ApiProperty({
    example: "2023-10-01T12:00:00Z",
    description: "The timestamp of the log",
    required: true,
    type: "string",
    format: "date-time",
  })
  timestamp?: Date;
}
