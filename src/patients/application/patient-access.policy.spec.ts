import { ForbiddenException } from '@nestjs/common';
import { AuthUser } from '../../auth/auth-user';
import {
  canAccessClinicPatientRecords,
  canReadPatientClinicalData,
  canReadPatientContacts,
  canReadPatientFinancials,
  patientAppointmentVisibility,
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

  it('centralizes read visibility for patient records and appointments', () => {
    const assignedDoctor = {
      ...patientUser,
      role: 'doctor',
      permissions: ['appointments.read.assigned', 'patients.clinical.read'],
    } satisfies AuthUser;
    expect(canAccessClinicPatientRecords(assignedDoctor)).toBe(true);
    expect(canReadPatientClinicalData(assignedDoctor)).toBe(true);
    expect(canReadPatientContacts(assignedDoctor)).toBe(false);
    expect(canReadPatientFinancials(assignedDoctor)).toBe(false);
    expect(patientAppointmentVisibility(assignedDoctor)).toEqual({
      doctorId: assignedDoctor.id,
    });
    expect(patientAppointmentVisibility(patientUser)).toEqual({
      id: { in: [] },
    });
  });
});
