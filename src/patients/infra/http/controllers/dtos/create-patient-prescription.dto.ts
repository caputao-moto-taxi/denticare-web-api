import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

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
