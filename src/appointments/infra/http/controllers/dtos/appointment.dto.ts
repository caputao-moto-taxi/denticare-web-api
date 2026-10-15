import {
  IsDateString,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateAppointmentDto {
  @IsString()
  @MinLength(1)
  patientId: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  doctorId?: string;

  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  time: string;

  @IsString()
  @MinLength(2)
  @MaxLength(300)
  reason: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;
}

export class RescheduleAppointmentDto {
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  time: string;
}

export class UpdateAppointmentDto {
  @IsString()
  @MinLength(1)
  patientId: string;

  @IsString()
  @MinLength(1)
  doctorId: string;

  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  time: string;

  @IsString()
  @MinLength(2)
  @MaxLength(300)
  reason: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;
}

export class AppointmentAvailabilityQuery {
  @IsOptional()
  @IsString()
  @MinLength(1)
  doctorId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  excludeAppointmentId?: string;

  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date: string;
}
