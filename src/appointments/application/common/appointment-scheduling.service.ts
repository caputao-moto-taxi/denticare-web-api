import {
  clinicNow,
  resolveClinicSchedule,
  WeeklySchedule,
} from '../../../shared/helpers/schedule';
import {
  Appointment,
  AppointmentDoctor,
  AppointmentNotFoundError,
  assertSlotIsFree,
  buildFreeSlots,
  doctorScheduleOrClinic,
  FreeSlot,
  IAppointmentClinicRepository,
  IAppointmentRepository,
  BookedSlot,
} from '../../domain';

export type ClinicContext = { schedule: WeeklySchedule; timezone: string };

export type FindFreeSlotsInput = {
  date: Date;
  clinic: ClinicContext;
  doctors: AppointmentDoctor[];
  excludedAppointmentId?: string;
};

export type CommitOptions = {
  isNew: boolean;
  // Skip when the appointment keeps the slot it already holds.
  checkSlot?: boolean;
};

export class AppointmentSchedulingService {
  constructor(
    private readonly clinics: IAppointmentClinicRepository,
    private readonly appointments: IAppointmentRepository,
  ) {}

  async loadClinic(branchId: string): Promise<ClinicContext> {
    const clinic = await this.clinics.findByBranchId(branchId);
    if (!clinic) throw new AppointmentNotFoundError('Branch not found');
    return {
      schedule: resolveClinicSchedule(clinic),
      timezone: clinic.timezone,
    };
  }

  async findFreeSlots(
    input: FindFreeSlotsInput,
  ): Promise<{ slots: FreeSlot[]; booked: BookedSlot[]; now: Date }> {
    const { date, clinic, doctors, excludedAppointmentId } = input;
    const booked = await this.appointments.findBookedSlots({
      doctorIds: doctors.map(({ id }) => id),
      date,
      excludedAppointmentId,
    });
    const now = clinicNow(clinic.timezone);
    const slots = buildFreeSlots({
      date,
      clinic: clinic.schedule,
      doctors: doctors.map((doctor) => ({
        id: doctor.id,
        schedule: doctorScheduleOrClinic(doctor.profile, clinic.schedule),
      })),
      booked,
      now,
    });
    return { slots, booked, now };
  }

  // Checks the slot and persists under the doctor's lock, so two concurrent
  // requests can never book the same slot.
  async commit(
    appointment: Appointment,
    { isNew, checkSlot = true }: CommitOptions,
  ): Promise<void> {
    await this.appointments.runWithDoctorLock(
      appointment.doctorId,
      async (repository) => {
        if (checkSlot) {
          const booked = await repository.findBookedSlots({
            doctorIds: [appointment.doctorId],
            date: appointment.date,
            excludedAppointmentId: isNew ? undefined : appointment.id.value,
          });
          assertSlotIsFree(
            appointment.time,
            booked.map(({ time }) => time),
          );
        }
        if (isNew) await repository.insert(appointment);
        else await repository.update(appointment);
      },
    );
  }
}
