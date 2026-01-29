import { ApiProperty } from '@nestjs/swagger';
import {
  Allow,
  IsBoolean,
  IsDate,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ErrorMessages } from '../../../../../shared/helpers/errorMessages';
import { Type } from 'class-transformer';

export class CreatePlanDto {
  @ApiProperty()
  @IsString({ message: ErrorMessages.NAME_IS_REQUIRED })
  @Allow()
  @IsNotEmpty({ message: ErrorMessages.NAME_IS_REQUIRED })
  name: string;

  @ApiProperty()
  @IsNotEmpty({ message: ErrorMessages.PRICE_IS_REQUIRED })
  @Allow()
  @IsNumber()
  price: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  currencyId: string;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  duration: number;

  @ApiProperty()
  @IsBoolean()
  @IsNotEmpty()
  isOnPromotion: boolean;

  @ApiProperty()
  @IsNumber()
  @Allow()
  promotionalPrice?: number;

  @ApiProperty()
  @Allow()
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  promotionalStartAt?: Date;

  @ApiProperty()
  @Allow()
  @IsOptional()
  @Type(() => Date)
  promotionalEndAt?: Date;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  totalBranch: number;
}
