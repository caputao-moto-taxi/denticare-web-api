import {
  IsDateString,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import { APPOINTMENT_DATE_PATTERN } from '../../../domain';

export class GetAppointmentAvailabilityInput {
  @IsOptional()
  @IsString()
  @MinLength(1)
  doctorId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  excludeAppointmentId?: string;

  @IsDateString({ strict: true })
  @Matches(APPOINTMENT_DATE_PATTERN)
  date: string;
}
