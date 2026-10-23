export type AppointmentClinic = {
  workingDays: string[];
  workingHours: unknown;
  timezone: string;
};

export interface IAppointmentClinicRepository {
  findByBranchId(branchId: string): Promise<AppointmentClinic | null>;
}
