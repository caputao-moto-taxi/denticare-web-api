import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

export const PATIENT_DOCUMENT_TYPES = [
  'JUSTIFICATIVO_FALTA',
  'TERMO_RESPONSABILIDADE',
] as const;

export type PatientDocumentType = (typeof PATIENT_DOCUMENT_TYPES)[number];

export class CreatePatientDocumentDto {
  @IsUUID()
  patientId: string;

  @IsIn(PATIENT_DOCUMENT_TYPES)
  type: PatientDocumentType;

  @ValidateIf(
    (input: CreatePatientDocumentDto) => input.type === 'JUSTIFICATIVO_FALTA',
  )
  @IsDateString()
  absenceDate?: string;

  @ValidateIf(
    (input: CreatePatientDocumentDto) => input.type === 'JUSTIFICATIVO_FALTA',
  )
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  absenceReason?: string;

  @ValidateIf(
    (input: CreatePatientDocumentDto) => input.type === 'JUSTIFICATIVO_FALTA',
  )
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  recipient?: string;

  @ValidateIf(
    (input: CreatePatientDocumentDto) =>
      input.type === 'TERMO_RESPONSABILIDADE',
  )
  @IsString()
  @MinLength(2)
  @MaxLength(180)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  procedureName?: string;

  @ValidateIf(
    (input: CreatePatientDocumentDto) =>
      input.type === 'TERMO_RESPONSABILIDADE',
  )
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  responsibleName?: string;

  @ValidateIf(
    (input: CreatePatientDocumentDto) =>
      input.type === 'TERMO_RESPONSABILIDADE',
  )
  @IsString()
  @MinLength(3)
  @MaxLength(40)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  responsibleDocument?: string;

  @ValidateIf(
    (input: CreatePatientDocumentDto) =>
      input.type === 'TERMO_RESPONSABILIDADE',
  )
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  relationship?: string;

  @ValidateIf(
    (input: CreatePatientDocumentDto) =>
      input.type === 'TERMO_RESPONSABILIDADE',
  )
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  responsibilityStatement?: string;
}

export class ListPatientDocumentsDto {
  @IsOptional()
  @IsUUID()
  patientId?: string;

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
  pageSize = 25;
}

export class ListDocumentPatientsDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
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
  pageSize = 100;
}
