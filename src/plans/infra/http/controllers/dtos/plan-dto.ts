import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Allow,
  IsBoolean,
  IsDate,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  IsUUID,
  ValidateIf,
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
  @Min(0)
  price: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  currencyId: string;

  @ApiProperty()
  @IsInt()
  @IsNotEmpty()
  @Min(1)
  duration: number;

  @ApiProperty()
  @IsBoolean()
  @IsNotEmpty()
  isOnPromotion: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Allow()
  promotionalPrice?: number;

  @ApiPropertyOptional()
  @Allow()
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  promotionalStartDate?: Date;

  @ApiPropertyOptional()
  @Allow()
  @IsOptional()
  @Type(() => Date)
  promotionalEndDate?: Date;

  @ApiProperty()
  @IsInt()
  @IsNotEmpty()
  @Min(1)
  totalBranch: number;
}

export class UpdatePlanPromotionDto {
  @ApiProperty()
  @IsBoolean()
  isOnPromotion: boolean;

  @ApiPropertyOptional()
  @ValidateIf((input: UpdatePlanPromotionDto) => input.isOnPromotion)
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  promotionalPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  promotionalStartDate?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  promotionalEndDate?: Date;
}

export class UpdatePlanDto {
  @ApiProperty()
  @IsString({ message: ErrorMessages.NAME_IS_REQUIRED })
  @IsNotEmpty({ message: ErrorMessages.NAME_IS_REQUIRED })
  @MaxLength(255)
  name: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  price: number;

  @ApiProperty()
  @IsUUID()
  currencyId: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  duration: number;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  totalBranch: number;
}

export class AddPlanBenefitDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  details?: string;
}
