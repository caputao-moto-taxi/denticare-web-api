import { AuthUser } from '../../../../auth/auth-user';
import { IUseCase } from '../../../../shared/application/use-case.interface';
import {
  createdResponse,
  HttpResponse,
} from '../../../../shared/contracts/httpContracts';
import {
  Appointment,
  AppointmentConflictError,
  AppointmentNotFoundError,
  assertCanBook,
  assertClinicOpen,
  assertDoctorAvailable,
  assertNotInThePast,
  IAppointmentDoctorRepository,
  IAppointmentPatientRepository,
  IAppointmentRepository,
  parseAppointmentDateTime,
  rankDoctorsByLoad,
} from '../../../domain';
import {
  AppointmentErrorBody,
  toAppointmentErrorResponse,
} from '../../common/appointment-error.mapper';
import { findAppointmentOutput } from '../../common/appointment.loaders';
import { AppointmentOutput } from '../../common/appointment.output';
import {
  AppointmentSchedulingService,
  ClinicContext,
} from '../../common/appointment-scheduling.service';
import { CreateAppointmentInput } from './create-appointment.input';

export type CreateAppointmentRequest = {
  user: AuthUser;
  input: CreateAppointmentInput;
};

type Booking = {
  patientId: string;
  date: Date;
  time: Date;
  reason: string;
  description?: string;
  createdById: string;
};

export class CreateAppointmentUseCase implements IUseCase<
  CreateAppointmentRequest,
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
    input,
  }: CreateAppointmentRequest): Promise<
    HttpResponse<AppointmentOutput | AppointmentErrorBody>
  > {
    try {
      assertCanBook(user);
      const { date, time } = parseAppointmentDateTime(input.date, input.time);
      const clinic = await this._scheduling.loadClinic(user.branchId);
      assertNotInThePast(time, clinic.timezone);
      assertClinicOpen(date, input.time, clinic.schedule);

      const patient = await this._patients.findOne({
        branchId: user.branchId,
        ...(user.role === 'patient'
          ? { userId: user.id }
          : { id: input.patientId }),
      });
      if (!patient) {
        throw new AppointmentNotFoundError('Patient not found in this clinic');
      }

      const booking: Booking = {
        patientId: patient.id,
        date,
        time,
        reason: input.reason,
        description: input.description,
        createdById: user.id,
      };
      const appointment = input.doctorId
        ? await this.bookWithDoctor(user, input, booking, clinic)
        : await this.bookWithAnyDoctor(user, input, booking, clinic);

      return createdResponse(
        await findAppointmentOutput(this._repository, user, appointment.id),
      );
    } catch (error) {
      return toAppointmentErrorResponse(error);
    }
  }

  private async bookWithDoctor(
    user: AuthUser,
    input: CreateAppointmentInput,
    booking: Booking,
    clinic: ClinicContext,
  ) {
    const [doctor] = await this._doctors.findActive(
      user.branchId,
      input.doctorId,
    );
    if (!doctor) {
      throw new AppointmentNotFoundError('Doctor not found in this clinic');
    }
    assertDoctorAvailable(
      doctor.profile,
      clinic.schedule,
      booking.date,
      input.time,
    );
    return this.book(booking, doctor.id);
  }

  // Picks the least busy doctor who is free at the requested time.
  private async bookWithAnyDoctor(
    user: AuthUser,
    input: CreateAppointmentInput,
    booking: Booking,
    clinic: ClinicContext,
  ) {
    const doctors = await this._doctors.findActive(user.branchId);
    const { slots, booked } = await this._scheduling.findFreeSlots({
      date: booking.date,
      clinic,
      doctors,
    });
    const slot = slots.find((item) => item.time === input.time);

    // Another request may take the slot between the lookup and the insert, so fall through the ranking.
    for (const doctorId of rankDoctorsByLoad(slot?.doctorIds ?? [], booked)) {
      try {
        return await this.book(booking, doctorId);
      } catch (error) {
        if (!(error instanceof AppointmentConflictError)) throw error;
      }
    }
    throw new AppointmentConflictError(
      'No doctor is available for this time slot',
    );
  }

  private async book(booking: Booking, doctorId: string) {
    const appointment = Appointment.create({ ...booking, doctorId });
    await this._scheduling.commit(appointment, { isNew: true });
    return appointment;
  }
}
