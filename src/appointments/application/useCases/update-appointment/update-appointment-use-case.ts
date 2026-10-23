import { AuthUser } from '../../../../auth/auth-user';
import { IUseCase } from '../../../../shared/application/use-case.interface';
import {
  HttpResponse,
  successResponse,
} from '../../../../shared/contracts/httpContracts';
import {
  AppointmentNotFoundError,
  assertCanEdit,
  assertClinicOpen,
  assertDoctorAvailable,
  assertNotInThePast,
  IAppointmentDoctorRepository,
  IAppointmentPatientRepository,
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
import { UpdateAppointmentInput } from './update-appointment.input';

export type UpdateAppointmentRequest = {
  user: AuthUser;
  id: string;
  input: UpdateAppointmentInput;
};

export class UpdateAppointmentUseCase implements IUseCase<
  UpdateAppointmentRequest,
  AppointmentOutput | AppointmentErrorBody
> {
  constructor(
    private readonly _repository: IAppointmentRepository,
    private readonly _patients: IAppointmentPatientRepository,
    private readonly _doctors: IAppointmentDoctorRepository,
    private readonly _scheduling: AppointmentSchedulingService,
  ) {}

  async execute({
    user,
    id,
    input,
  }: UpdateAppointmentRequest): Promise<
    HttpResponse<AppointmentOutput | AppointmentErrorBody>
  > {
    try {
      const appointment = await findAccessibleAppointment(
        this._repository,
        user,
        id,
      );
      appointment.assertEditable();
      assertCanEdit(user, appointment, input);

      const patient = await this._patients.findOne({
        branchId: user.branchId,
        id: user.role === 'patient' ? appointment.patientId : input.patientId,
      });
      if (!patient) {
        throw new AppointmentNotFoundError('Patient not found in this clinic');
      }
      const [doctor] = await this._doctors.findActive(
        user.branchId,
        input.doctorId,
      );
      if (!doctor) {
        throw new AppointmentNotFoundError('Doctor not found in this clinic');
      }

      const { date, time } = parseAppointmentDateTime(input.date, input.time);
      const movesSlot = !appointment.isScheduledAt(doctor.id, date, time);
      const clinic = await this._scheduling.loadClinic(user.branchId);
      if (movesSlot) {
        assertNotInThePast(time, clinic.timezone);
        assertClinicOpen(date, input.time, clinic.schedule);
        assertDoctorAvailable(
          doctor.profile,
          clinic.schedule,
          date,
          input.time,
        );
      }

      appointment.edit({
        patientId: patient.id,
        doctorId: doctor.id,
        date,
        time,
        reason: input.reason,
        description: input.description,
      });
      await this._scheduling.commit(appointment, {
        isNew: false,
        checkSlot: movesSlot,
      });

      return successResponse(
        await findAppointmentOutput(this._repository, user, appointment.id),
      );
    } catch (error) {
      return toAppointmentErrorResponse(error);
    }
  }
}
