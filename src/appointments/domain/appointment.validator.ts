import {
  IsDate,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ClassValidatorFields } from '../../shared/domain/validators/class-validator-fields';
import { Notification } from '../../shared/domain/validators/notification';

export const APPOINTMENT_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
export const APPOINTMENT_TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
export const APPOINTMENT_REASON_MAX_LENGTH = 300;
export const APPOINTMENT_DESCRIPTION_MAX_LENGTH = 4000;

export class AppointmentRules {
  @IsString({ groups: ['patientId'] })
  @IsNotEmpty({ groups: ['patientId'] })
  patientId: string;

  @IsString({ groups: ['doctorId'] })
  @IsNotEmpty({ groups: ['doctorId'] })
  doctorId: string;

  @IsDate({ groups: ['date'] })
  date: Date;

  @IsDate({ groups: ['time'] })
  time: Date;

  @IsString({ groups: ['reason'] })
  @IsNotEmpty({ groups: ['reason'] })
  @MaxLength(APPOINTMENT_REASON_MAX_LENGTH, { groups: ['reason'] })
  reason: string;

  @IsOptional({ groups: ['description'] })
  @IsString({ groups: ['description'] })
  @MaxLength(APPOINTMENT_DESCRIPTION_MAX_LENGTH, { groups: ['description'] })
  description?: string;

  constructor(entity: object) {
    Object.assign(this, entity);
  }
}

export class AppointmentValidator extends ClassValidatorFields {
  validate(
    notification: Notification,
    data: object,
    fields?: string[],
  ): boolean {
    const newFields = fields?.length
      ? fields
      : ['patientId', 'doctorId', 'date', 'time', 'reason', 'description'];
    return super.validate(notification, new AppointmentRules(data), newFields);
  }
}

export class AppointmentValidatorFactory {
  static create() {
    return new AppointmentValidator();
  }
}
