import { AuthUser } from '../../auth/auth-user';
import { hasPermission } from '../../auth/permissions';
import { AppointmentAccessDeniedError } from './appointment.errors';

const STAFF_ROLES = new Set([
  'admin',
  'doctor',
  'nurse',
  'secretary',
  'receptionist',
]);

// Restricts which appointments a user may load: staff see their whole branch,
// anyone else only the appointments of the patients they own.
export type AppointmentScope = { branchId: string; patientUserId?: string };

export type AppointmentListVisibility = 'patient' | 'all' | 'assigned';

export function isStaff(user: AuthUser): boolean {
  return STAFF_ROLES.has(user.role);
}

export function scopeFor(user: AuthUser): AppointmentScope {
  return isStaff(user)
    ? { branchId: user.branchId }
    : { branchId: user.branchId, patientUserId: user.id };
}

export function assertCanBook(user: AuthUser): void {
  if (!isStaff(user) && user.role !== 'patient') {
    throw new AppointmentAccessDeniedError(
      'Clinic staff or patient access is required',
    );
  }
}

export function listVisibilityFor(user: AuthUser): AppointmentListVisibility {
  if (user.role === 'patient') return 'patient';
  if (
    hasPermission(user, 'appointments.read.all') ||
    hasPermission(user, 'appointments.manage')
  ) {
    return 'all';
  }
  if (hasPermission(user, 'appointments.read.assigned')) return 'assigned';
  throw new AppointmentAccessDeniedError('Appointment read access is required');
}

// Patient ownership is already enforced by the scope used to load the appointment.
export function assertCanAccess(
  user: AuthUser,
  appointment: { doctorId: string },
): void {
  if (user.role === 'patient') return;
  if (
    hasPermission(user, 'appointments.read.all') ||
    hasPermission(user, 'appointments.manage')
  ) {
    return;
  }
  if (
    hasPermission(user, 'appointments.read.assigned') &&
    appointment.doctorId === user.id
  ) {
    return;
  }
  throw new AppointmentAccessDeniedError('You cannot access this appointment');
}

export function assertCanComplete(user: AuthUser): void {
  if (user.role !== 'admin' && user.role !== 'doctor') {
    throw new AppointmentAccessDeniedError(
      'Only administrators and doctors can complete appointments',
    );
  }
}

export function assertCanEdit(
  user: AuthUser,
  current: { patientId: string; doctorId: string },
  changes: { patientId: string; doctorId: string },
): void {
  if (user.role === 'patient' && changes.patientId !== current.patientId) {
    throw new AppointmentAccessDeniedError(
      'Patients cannot change the appointment patient',
    );
  }
  if (user.role === 'doctor' && changes.doctorId !== current.doctorId) {
    throw new AppointmentAccessDeniedError(
      'Doctors cannot reassign appointments',
    );
  }
}
