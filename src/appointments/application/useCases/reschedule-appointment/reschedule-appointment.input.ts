import { IsDateString, IsString, Matches } from 'class-validator';
import {
  APPOINTMENT_DATE_PATTERN,
  APPOINTMENT_TIME_PATTERN,
} from '../../../domain';

export class RescheduleAppointmentInput {
  @IsDateString({ strict: true })
  @Matches(APPOINTMENT_DATE_PATTERN)
  date: string;

  @IsString()
  @Matches(APPOINTMENT_TIME_PATTERN)
  time: string;
}
