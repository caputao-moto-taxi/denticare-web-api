import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { SubscriptionRequestStatus } from '../../../../generated/prisma/client';

export class CreateSubscriptionRequestDto {
  @IsUUID('4')
  planId: string;

  @IsDateString()
  paymentDate: string;

  @IsString()
  @Matches(/^\d{1,10}(\.\d{1,2})?$/)
  amountPaid: string;

  @IsOptional()
  @IsString()
  @Length(1, 120)
  paymentReference?: string;

  @IsOptional()
  @IsString()
  @Length(1, 1000)
  notes?: string;
}

export class RespondToInformationRequestDto {
  @IsString()
  @Length(1, 1000)
  response: string;
}

export class RejectSubscriptionRequestDto {
  @IsString()
  @Length(5, 1000)
  reason: string;
}

export class RequestSubscriptionInformationDto {
  @IsString()
  @Length(5, 1000)
  message: string;
}

export class UpdateSubscriptionSettingsDto {
  @IsString()
  @Length(2, 120)
  bankName: string;

  @IsString()
  @Length(2, 120)
  accountHolder: string;

  @IsString()
  @Length(15, 34)
  @Matches(/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/)
  iban: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(720)
  estimatedReviewHours: number;
}

export class SubscriptionRequestFilterDto {
  @IsOptional()
  @IsEnum(SubscriptionRequestStatus)
  status?: SubscriptionRequestStatus;

  @IsOptional()
  @IsUUID('4')
  planId?: string;

  @IsOptional()
  @IsUUID('4')
  headquarterId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  clinic?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  plan?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;
}

export class PlatformClinicFilterDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;
}
