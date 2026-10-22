import { AuthUser } from '../../auth/auth-user';

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
  abstract getSettings(user: AuthUser): Promise<unknown>;
  abstract updateSettings(
    user: AuthUser,
    input: ClinicSettingsUpdateCommand,
  ): Promise<unknown>;
  abstract getPublicClinic(branchId: string): Promise<unknown>;
  abstract listServices(user: AuthUser): Promise<unknown>;
  abstract createService(
    user: AuthUser,
    input: ClinicServiceCommand,
  ): Promise<unknown>;
  abstract updateService(
    user: AuthUser,
    id: string,
    input: ClinicServiceUpdateCommand,
  ): Promise<unknown>;
  abstract deleteService(user: AuthUser, id: string): Promise<unknown>;
  abstract getLogoKey(user: AuthUser): Promise<string | null>;
  abstract getPublicLogoKey(branchId: string): Promise<string | null>;
  abstract updateLogoKey(
    user: AuthUser,
    storageKey: string,
  ): Promise<string | null>;
}
