export type ClinicSettingsUpdateCommand = {
  name?: string;
  description?: string;
  nif?: string;
  email?: string;
  phone?: string;
  address?: string;
  province?: string;
  city?: string;
  country?: string;
};

export type ClinicServiceCommand = {
  name: string;
  description?: string;
  price: number;
  durationMinutes: number;
};

export type ClinicServiceUpdateCommand = Partial<ClinicServiceCommand>;

export abstract class IClinicSettingsRepository {
  abstract getSettings(branchId: string): Promise<unknown>;
  abstract updateSettings(
    branchId: string,
    input: ClinicSettingsUpdateCommand,
  ): Promise<unknown>;
  abstract getPublicClinic(branchId: string): Promise<unknown>;
  abstract listServices(branchId: string): Promise<unknown>;
  abstract createService(
    branchId: string,
    input: ClinicServiceCommand,
  ): Promise<unknown>;
  abstract updateService(
    branchId: string,
    id: string,
    input: ClinicServiceUpdateCommand,
  ): Promise<unknown>;
  abstract deleteService(branchId: string, id: string): Promise<unknown>;
  abstract getLogoKey(branchId: string): Promise<string | null>;
  abstract getPublicLogoKey(branchId: string): Promise<string | null>;
  abstract updateLogoKey(branchId: string, storageKey: string): Promise<void>;
}
