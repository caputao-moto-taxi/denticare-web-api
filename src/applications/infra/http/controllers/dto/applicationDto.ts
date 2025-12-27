import { ApiProperty } from '@nestjs/swagger';
import { ApplicationVersionStatus } from '@prisma/client';
import {
  IsString,
  IsNotEmpty,
  Allow,
  IsEnum,
  IsUUID,
} from 'class-validator';

export class CreateApplicationDto {
  @IsString()
  @Allow()
  @IsNotEmpty()
  @ApiProperty({
    required: true,
    description: 'Application name',
    example: 'Dentcare Ride Api',
  })
  name: string;

  @ApiProperty({
    required: true,
    description: 'Application version status',
    example: 'DEVELEPMENT',
  })
  @Allow()
  @IsNotEmpty()
  @IsEnum(ApplicationVersionStatus)
  versionStatus: string;
}

export class GetApplicationDto {
  @IsString()
  @Allow()
  @IsNotEmpty()
  @IsUUID('4', { message: 'Invalid UUID format' })
  @ApiProperty({
    required: true,
    description: 'Application ID',
    example: 'ab4cb836-b77d-4482-957e-465f7be5aefa',
  })
  id: string;
}
