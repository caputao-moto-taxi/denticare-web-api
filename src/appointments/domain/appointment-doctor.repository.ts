import { DoctorWorkingProfile } from './appointment-scheduling.policy';

export type AppointmentDoctor = {
  id: string;
  profile: DoctorWorkingProfile | null;
};

export interface IAppointmentDoctorRepository {
  // Active doctors of the branch, oldest first; optionally a single one.
  findActive(branchId: string, doctorId?: string): Promise<AppointmentDoctor[]>;
  findProfile(doctorId: string): Promise<DoctorWorkingProfile | null>;
}
