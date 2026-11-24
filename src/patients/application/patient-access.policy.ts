import { ForbiddenException } from '@nestjs/common';
import { AuthUser } from '../../auth/auth-user';
import { hasPermission } from '../../auth/permissions';

const STAFF_ROLES = new Set([
  'admin',
  'doctor',
  'nurse',
  'secretary',
  'receptionist',
]);

export function requirePatientStaff(user: AuthUser) {
  if (!canAccessClinicPatientRecords(user)) {
    throw new ForbiddenException('Clinic staff access is required');
  }
}

export function canAccessClinicPatientRecords(user: AuthUser) {
  return STAFF_ROLES.has(user.role);
}

export function canReadPatientClinicalData(user: AuthUser) {
  return hasPermission(user, 'patients.clinical.read');
}

export function canReadPatientContacts(user: AuthUser) {
  return hasPermission(user, 'patients.contacts.read');
}

export function canReadPatientFinancials(user: AuthUser) {
  return hasPermission(user, 'patients.financial.read');
}

export function patientAppointmentVisibility(user: AuthUser) {
  if (
    hasPermission(user, 'appointments.read.all') ||
    hasPermission(user, 'appointments.manage')
  ) {
    return {};
  }
  if (hasPermission(user, 'appointments.read.assigned')) {
    return { doctorId: user.id };
  }
  return { id: { in: [] as string[] } };
}

export function requirePatientClinicalAccess(
  user: AuthUser,
  access: 'read' | 'write' = 'write',
) {
  const permission =
    access === 'read' ? 'patients.clinical.read' : 'patients.clinical.write';
  if (!hasPermission(user, permission)) {
    throw new ForbiddenException('Clinical permissions are required');
  }
}
