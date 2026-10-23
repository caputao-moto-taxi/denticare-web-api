import {
  CreateAppointmentInput,
  GetAppointmentAvailabilityInput,
  RescheduleAppointmentInput,
  UpdateAppointmentInput,
} from '../../../../application/useCases';

export class CreateAppointmentDto extends CreateAppointmentInput {}

export class RescheduleAppointmentDto extends RescheduleAppointmentInput {}

export class UpdateAppointmentDto extends UpdateAppointmentInput {}

export class AppointmentAvailabilityQuery extends GetAppointmentAvailabilityInput {}
