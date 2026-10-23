import { AppointmentView } from '../../domain';

export type AppointmentOutput = {
  id: string;
  date: string;
  time: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  specialty: string;
  reason: string;
  description: string;
  status: string;
};

export class AppointmentOutputMapper {
  static toOutput(view: AppointmentView): AppointmentOutput {
    const doctorName =
      `${view.doctor.firstName ?? ''} ${view.doctor.lastName ?? ''}`.trim();
    return {
      id: view.id,
      date: view.date.toISOString().slice(0, 10),
      time: view.time.toISOString().slice(11, 16),
      patientId: view.patient.id,
      patientName: `${view.patient.firstName} ${view.patient.lastName}`.trim(),
      doctorId: view.doctor.id,
      doctorName: view.doctor.firstName ? doctorName : view.doctor.email,
      specialty: view.doctor.specialty ?? '',
      reason: view.reason,
      description: view.description ?? '',
      status: view.status.toLowerCase(),
    };
  }
}
