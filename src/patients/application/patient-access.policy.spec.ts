import { ForbiddenException } from '@nestjs/common';
import { AuthUser } from '../../auth/auth-user';
import {
  requirePatientClinicalAccess,
  requirePatientStaff,
} from './patient-access.policy';

const patientUser: AuthUser = {
  id: 'patient-1',
  email: 'patient@example.test',
  role: 'patient',
  branchId: 'branch-1',
  permissions: [],
};

describe('patient access policy', () => {
  it('allows clinic staff and rejects patient users for staff-only actions', () => {
    expect(() =>
      requirePatientStaff({ ...patientUser, role: 'admin' }),
    ).not.toThrow();
    expect(() => requirePatientStaff(patientUser)).toThrow(ForbiddenException);
  });

  it('requires the requested clinical permission', () => {
    expect(() =>
      requirePatientClinicalAccess({
        ...patientUser,
        permissions: ['patients.clinical.write'],
      }),
    ).not.toThrow();
    expect(() => requirePatientClinicalAccess(patientUser)).toThrow(
      ForbiddenException,
    );
    expect(() => requirePatientClinicalAccess(patientUser, 'read')).toThrow(
      ForbiddenException,
    );
  });
});
