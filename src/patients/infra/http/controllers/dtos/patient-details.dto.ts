import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Matches,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

const FDI_TEETH = [
  11, 12, 13, 14, 15, 16, 17, 18, 21, 22, 23, 24, 25, 26, 27, 28, 31, 32, 33,
  34, 35, 36, 37, 38, 41, 42, 43, 44, 45, 46, 47, 48,
];

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

export class PatientPrescriptionItemDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  medication: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  dosage: string;

  @IsString()
  @MinLength(2)
  @MaxLength(2000)
  instructions: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  duration: string;
}

export class CreatePatientPrescriptionDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => PatientPrescriptionItemDto)
  items: PatientPrescriptionItemDto[];
}

export enum FinancialMethod {
  MULTICAIXA = 'Multicaixa',
  TRANSFER = 'Transferência',
  CASH = 'Dinheiro',
  INSURANCE = 'Convênio',
}

export class CreatePatientFinancialEntryDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  description: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(1000000000)
  amount: number;

  @IsEnum(FinancialMethod)
  method: FinancialMethod;
}

export enum ExamType {
  PANORAMIC = 'Raio-X Panorâmico',
  PERIAPICAL = 'Periapical',
  TOMOGRAPHY = 'Tomografia',
  SCAN_3D = '3D Scan',
  PHOTOGRAPH = 'Fotografia',
}

export class CreatePatientExamDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title: string;

  @IsEnum(ExamType)
  type: ExamType;
}
