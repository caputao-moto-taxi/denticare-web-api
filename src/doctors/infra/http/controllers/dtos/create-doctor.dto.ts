import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsEmail,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateDoctorDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  @IsEmail()
  @MaxLength(254)
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string;

  @IsString()
  @MinLength(3)
  @MaxLength(300)
  address: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  avatar?: string;

  @IsOptional()
  @IsIn(['FULL_TIME', 'PART_TIME'])
  type?: 'FULL_TIME' | 'PART_TIME';

  @IsOptional()
  @IsString()
  @MaxLength(60)
  crmNumber?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specialties?: string[];

  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsString({ each: true })
  workingDays: string[];

  @IsObject()
  workingHours: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  daysOffNotes?: string;
}
