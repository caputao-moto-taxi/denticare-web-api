import {
  Appointment as AppointmentModel,
  Prisma,
} from '../../../../../generated/prisma/client';
import {
  Appointment,
  AppointmentId,
  AppointmentStatus,
  AppointmentView,
} from '../../../domain';

export const APPOINTMENT_VIEW_INCLUDE = {
  patient: true,
  doctor: {
    include: {
      Person: { where: { deletedAt: null }, take: 1 },
      doctorProfile: true,
    },
  },
} satisfies Prisma.AppointmentInclude;

export type AppointmentViewModel = Prisma.AppointmentGetPayload<{
  include: typeof APPOINTMENT_VIEW_INCLUDE;
}>;

export class AppointmentModelMapper {
  static toCreateModel(
    appointment: Appointment,
  ): Prisma.AppointmentUncheckedCreateInput {
    return {
      id: appointment.id.value,
      date: appointment.date,
      time: appointment.time,
      reason: appointment.reason,
      description: appointment.description ?? null,
      status: appointment.status,
      patientId: appointment.patientId,
      doctorId: appointment.doctorId,
      userId: appointment.createdById ?? null,
      createdAt: appointment.createdAt,
      updatedAt: appointment.updatedAt,
    };
  }

  static toUpdateModel(
    appointment: Appointment,
  ): Prisma.AppointmentUncheckedUpdateInput {
    return {
      date: appointment.date,
      time: appointment.time,
      reason: appointment.reason,
      description: appointment.description ?? null,
      status: appointment.status,
      patientId: appointment.patientId,
      doctorId: appointment.doctorId,
    };
  }

  static toEntity(model: AppointmentModel): Appointment {
    return new Appointment({
      id: new AppointmentId(model.id),
      patientId: model.patientId,
      doctorId: model.doctorId,
      date: model.date,
      time: model.time,
      reason: model.reason,
      description: model.description ?? undefined,
      status: model.status as AppointmentStatus,
      createdById: model.userId ?? undefined,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    });
  }

  static toView(model: AppointmentViewModel): AppointmentView {
    const person = model.doctor.Person[0];
    return {
      id: model.id,
      date: model.date,
      time: model.time,
      reason: model.reason,
      description: model.description,
      status: model.status as AppointmentStatus,
      patient: {
        id: model.patient.id,
        firstName: model.patient.firstName,
        lastName: model.patient.lastName,
      },
      doctor: {
        id: model.doctor.id,
        email: model.doctor.email,
        firstName: person?.firstName,
        lastName: person?.lastName,
        specialty: model.doctor.doctorProfile?.specialties[0],
      },
    };
  }
}
