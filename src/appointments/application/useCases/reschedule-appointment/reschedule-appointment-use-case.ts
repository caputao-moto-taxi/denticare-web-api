import { AuthUser } from '../../../../auth/auth-user';
import { IUseCase } from '../../../../shared/application/use-case.interface';
import {
  HttpResponse,
  successResponse,
} from '../../../../shared/contracts/httpContracts';
import {
  assertClinicOpen,
  assertDoctorAvailable,
  assertNotInThePast,
  IAppointmentDoctorRepository,
  IAppointmentRepository,
  parseAppointmentDateTime,
} from '../../../domain';
import {
  AppointmentErrorBody,
  toAppointmentErrorResponse,
} from '../../common/appointment-error.mapper';
import {
  findAccessibleAppointment,
  findAppointmentOutput,
} from '../../common/appointment.loaders';
import { AppointmentOutput } from '../../common/appointment.output';
import { AppointmentSchedulingService } from '../../common/appointment-scheduling.service';
import { RescheduleAppointmentInput } from './reschedule-appointment.input';

export type RescheduleAppointmentRequest = {
  user: AuthUser;
  id: string;
  input: RescheduleAppointmentInput;
};

export class RescheduleAppointmentUseCase implements IUseCase<
  RescheduleAppointmentRequest,
  AppointmentOutput | AppointmentErrorBody
> {
  constructor(
    private readonly _repository: IAppointmentRepository,
    private readonly _doctors: IAppointmentDoctorRepository,
    private readonly _scheduling: AppointmentSchedulingService,
  ) {}

  async execute({
    user,
    id,
    input,
  }: RescheduleAppointmentRequest): Promise<
    HttpResponse<AppointmentOutput | AppointmentErrorBody>
  > {
    try {
      const appointment = await findAccessibleAppointment(
        this._repository,
        user,
        id,
      );
      appointment.assertReschedulable();

      const { date, time } = parseAppointmentDateTime(input.date, input.time);
      const clinic = await this._scheduling.loadClinic(user.branchId);
      assertNotInThePast(time, clinic.timezone);
      assertClinicOpen(date, input.time, clinic.schedule);
      assertDoctorAvailable(
        await this._doctors.findProfile(appointment.doctorId),
        clinic.schedule,
        date,
        input.time,
      );

      appointment.reschedule(date, time);
      await this._scheduling.commit(appointment, { isNew: false });

      return successResponse(
        await findAppointmentOutput(this._repository, user, appointment.id),
      );
    } catch (error) {
      return toAppointmentErrorResponse(error);
    }
  }
}
