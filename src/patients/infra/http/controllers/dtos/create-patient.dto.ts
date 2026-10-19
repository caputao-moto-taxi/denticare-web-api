import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsDateString,
  IsEmail,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export enum PatientGender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

export class CreatePatientDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string | null;

  @IsOptional()
  @IsEnum(PatientGender)
  gender?: PatientGender | null;

  @IsString()
  @MinLength(3)
  @MaxLength(300)
  address: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  medicalNotes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  idNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  nif?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  profession?: string;

  @IsOptional()
  @IsIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown'])
  bloodType?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  insuranceProvider?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  insurancePlan?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  insurancePolicyNumber?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  insuranceCoveragePercent?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  emergencyContactName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  emergencyContactRelationship?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  emergencyContactPhone?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(50)
  @MinLength(1, { each: true })
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  allergies?: string[];

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(50)
  @MinLength(1, { each: true })
  @IsString({ each: true })
  @MaxLength(160, { each: true })
  medicalConditions?: string[];

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(50)
  @MinLength(1, { each: true })
  @IsString({ each: true })
  @MaxLength(160, { each: true })
  medications?: string[];
}
