import {
  IsDateString,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  APPOINTMENT_DATE_PATTERN,
  APPOINTMENT_DESCRIPTION_MAX_LENGTH,
  APPOINTMENT_REASON_MAX_LENGTH,
  APPOINTMENT_TIME_PATTERN,
} from '../../../domain';

export class UpdateAppointmentInput {
  @IsString()
  @MinLength(1)
  patientId: string;

  @IsString()
  @MinLength(1)
  doctorId: string;

  @IsDateString({ strict: true })
  @Matches(APPOINTMENT_DATE_PATTERN)
  date: string;

  @IsString()
  @Matches(APPOINTMENT_TIME_PATTERN)
  time: string;

  @IsString()
  @MinLength(2)
  @MaxLength(APPOINTMENT_REASON_MAX_LENGTH)
  reason: string;

  @IsOptional()
  @IsString()
  @MaxLength(APPOINTMENT_DESCRIPTION_MAX_LENGTH)
  description?: string;
}
