import { PartialType, OmitType } from '@nestjs/mapped-types';
import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const MAX_STEPS = 100;

export class CreateTreatmentPlanDto {
  @IsUUID()
  patientId: string;

  @IsUUID()
  doctorId: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  diagnosis: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1_000_000_000)
  totalCost: number;

  @IsInt()
  @Min(1)
  @Max(MAX_STEPS)
  totalSteps: number;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  notes?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  estimatedCompletion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  activePhase?: string;
}

// A plan cannot be moved to another patient.
export class UpdateTreatmentPlanDto extends PartialType(
  OmitType(CreateTreatmentPlanDto, ['patientId'] as const),
) {}

export class UpdateTreatmentPlanProgressDto {
  @IsInt()
  @Min(0)
  @Max(MAX_STEPS)
  completedSteps: number;
}
