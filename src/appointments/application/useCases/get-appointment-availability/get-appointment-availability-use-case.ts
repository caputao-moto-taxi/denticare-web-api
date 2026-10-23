import { AuthUser } from '../../../../auth/auth-user';
import { IUseCase } from '../../../../shared/application/use-case.interface';
import {
  HttpResponse,
  successResponse,
} from '../../../../shared/contracts/httpContracts';
import {
  APPOINTMENT_SLOT_DURATION_MS,
  AppointmentNotFoundError,
  assertCanBook,
  FreeSlot,
  IAppointmentDoctorRepository,
  IAppointmentRepository,
  isClosedDay,
  parseAppointmentDate,
} from '../../../domain';
import {
  AppointmentErrorBody,
  toAppointmentErrorResponse,
} from '../../common/appointment-error.mapper';
import { findAccessibleAppointment } from '../../common/appointment.loaders';
import { AppointmentSchedulingService } from '../../common/appointment-scheduling.service';
import { GetAppointmentAvailabilityInput } from './get-appointment-availability.input';

export type GetAppointmentAvailabilityRequest = {
  user: AuthUser;
  query: GetAppointmentAvailabilityInput;
};

export type AppointmentAvailabilityOutput = {
  date: string;
  doctorId: string | null;
  closed: boolean;
  slotDurationMinutes: number;
  slots: FreeSlot[];
};

export class GetAppointmentAvailabilityUseCase implements IUseCase<
  GetAppointmentAvailabilityRequest,
  AppointmentAvailabilityOutput | AppointmentErrorBody
> {
  constructor(
    private readonly _repository: IAppointmentRepository,
    private readonly _doctors: IAppointmentDoctorRepository,
    private readonly _scheduling: AppointmentSchedulingService,
  ) {}

  async execute({
    user,
    query,
  }: GetAppointmentAvailabilityRequest): Promise<
    HttpResponse<AppointmentAvailabilityOutput | AppointmentErrorBody>
  > {
    try {
      assertCanBook(user);
      const clinic = await this._scheduling.loadClinic(user.branchId);
      const doctors = await this._doctors.findActive(
        user.branchId,
        query.doctorId,
      );
      if (query.doctorId && doctors.length === 0) {
        throw new AppointmentNotFoundError('Doctor not found in this clinic');
      }

      const date = parseAppointmentDate(query.date);
      const { slots, now } = await this._scheduling.findFreeSlots({
        date,
        clinic,
        doctors,
        excludedAppointmentId: await this.findExcludedAppointmentId(
          user,
          query,
          date,
        ),
      });

      return successResponse({
        date: query.date,
        doctorId: query.doctorId ?? null,
        closed: isClosedDay(date, clinic.schedule, now),
        slotDurationMinutes: APPOINTMENT_SLOT_DURATION_MS / 60_000,
        slots,
      });
    } catch (error) {
      return toAppointmentErrorResponse(error);
    }
  }

  // The appointment being edited must not block its own slot.
  private async findExcludedAppointmentId(
    user: AuthUser,
    query: GetAppointmentAvailabilityInput,
    date: Date,
  ): Promise<string | undefined> {
    if (!query.excludeAppointmentId) return undefined;
    const excluded = await findAccessibleAppointment(
      this._repository,
      user,
      query.excludeAppointmentId,
    );
    const holdsRequestedDay =
      excluded.doctorId === query.doctorId &&
      excluded.date.getTime() === date.getTime() &&
      excluded.isOpen;
    return holdsRequestedDay ? excluded.id.value : undefined;
  }
}
