import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { WEEKDAY_CODES } from '../../../../../shared/helpers/schedule';

export class UpdateClinicScheduleDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsIn([...WEEKDAY_CODES], { each: true })
  workingDays: string[];

  // Each day is { start, end, lunchStart?, lunchEnd? }, checked by the repository.
  @IsObject()
  workingHours: Record<
    string,
    { start: string; end: string; lunchStart?: string; lunchEnd?: string }
  >;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  timezone?: string;
}
