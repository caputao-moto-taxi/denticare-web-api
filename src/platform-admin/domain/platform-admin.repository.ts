import { AuthUser } from '../../auth/auth-user';

export type PlatformClinicUpdateChanges = Partial<
  Record<
    'name' | 'address' | 'email' | 'phone' | 'nif' | 'description',
    string | null
  >
>;

export const MANAGED_STAFF_ROLES = [
  'admin',
  'administrator',
  'doctor',
  'nurse',
  'secretary',
  'receptionist',
];

export function clinicStatusAction(isActive: boolean) {
  return isActive ? 'CLINIC_ACTIVATED' : 'CLINIC_DEACTIVATED';
}

export function userStatusAction(isActive: boolean) {
  return isActive ? 'USER_ACTIVATED' : 'USER_BLOCKED';
}

export interface IPlatformAdminRepository {
  overview(): Promise<unknown>;
  listClinics(filter: {
    page: number;
    pageSize: number;
    status?: string;
    search?: string;
  }): Promise<unknown>;
  clinicDetails(clinicId: string): Promise<unknown>;
  updateClinic(
    clinicId: string,
    actor: AuthUser,
    changes: PlatformClinicUpdateChanges,
  ): Promise<unknown>;
  setClinicStatus(
    clinicId: string,
    actor: AuthUser,
    isActive: boolean,
    action: string,
  ): Promise<unknown>;
  setUserStatus(
    clinicId: string,
    userId: string,
    actor: AuthUser,
    isActive: boolean,
    action: string,
  ): Promise<unknown>;
}
