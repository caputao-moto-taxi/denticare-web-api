export type AppointmentPatientLookup = {
  branchId: string;
  id?: string;
  userId?: string;
};

export type AppointmentPatient = { id: string };

export interface IAppointmentPatientRepository {
  findOne(lookup: AppointmentPatientLookup): Promise<AppointmentPatient | null>;
}
