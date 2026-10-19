import { IsEnum, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { FDI_TEETH } from './fdi-teeth';

export enum ToothState {
  HEALTHY = 'healthy',
  TREATED = 'treated',
  TREATMENT_NEEDED = 'treatment_needed',
  MISSING = 'missing',
}

export class UpdatePatientToothDto {
  @IsIn(FDI_TEETH)
  number: number;

  @IsEnum(ToothState)
  state: ToothState;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  procedureDone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
