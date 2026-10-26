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
  if (!STAFF_ROLES.has(user.role)) {
    throw new ForbiddenException('Clinic staff access is required');
  }
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
