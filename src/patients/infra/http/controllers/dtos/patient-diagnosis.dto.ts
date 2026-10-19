import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { FDI_TEETH } from './fdi-teeth';

export enum DiagnosisSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

export enum DiagnosisStatus {
  RESOLVED = 'resolved',
  IN_TREATMENT = 'in_treatment',
  MONITORING = 'monitoring',
}

export class CreatePatientDiagnosisDto {
  @IsOptional()
  @IsString()
  @MaxLength(32)
  @Matches(/^[A-Za-z0-9][A-Za-z0-9./ -]{0,31}$/)
  code?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(160)
  title: string;

  @IsString()
  @MinLength(2)
  @MaxLength(4000)
  description: string;

  @IsEnum(DiagnosisSeverity)
  severity: DiagnosisSeverity;

  @IsEnum(DiagnosisStatus)
  status: DiagnosisStatus;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(32)
  @IsIn(FDI_TEETH, { each: true })
  affectedTeeth?: number[];
}

export class UpdatePatientDiagnosisDto extends CreatePatientDiagnosisDto {}
