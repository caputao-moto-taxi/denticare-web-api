import { Type, Transform } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ListQuery } from '../../domain/list-query';

export class ListQueryDto implements ListQuery {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000000)
  page = 1;

  @Type(() => Number)
  @IsIn([10, 25, 50, 100])
  pageSize = 10;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  search?: string;

  @IsOptional()
  @IsIn([
    'active',
    'inactive',
    'pending',
    'confirmed',
    'cancelled',
    'completed',
    'in-progress',
    'planned',
  ])
  status?: string;

  @IsOptional()
  @IsIn(['admin', 'doctor', 'nurse', 'secretary', 'receptionist', 'patient'])
  role?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  specialty?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  type?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  doctorId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  patientId?: string;

  @IsOptional()
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dateFrom?: string;

  @IsOptional()
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dateTo?: string;
}
