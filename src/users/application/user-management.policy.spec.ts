import { ForbiddenException } from '@nestjs/common';
import { AuthUser } from '../../auth/auth-user';
import { UserManagementPolicy } from './user-management.policy';

describe('UserManagementPolicy', () => {
  const administrator: AuthUser = {
    id: 'admin-1',
    email: 'admin@example.test',
    role: 'admin',
    branchId: 'branch-1',
  };

  it('allows administrators to manage users', () => {
    expect(() =>
      UserManagementPolicy.ensureAdministrator(administrator),
    ).not.toThrow();
  });

  it('rejects other roles from user management', () => {
    expect(() =>
      UserManagementPolicy.ensureAdministrator({
        ...administrator,
        role: 'doctor',
      }),
    ).toThrow(ForbiddenException);
  });

  it('prevents an administrator from targeting their own account', () => {
    expect(() =>
      UserManagementPolicy.ensureNotSelf(
        administrator,
        administrator.id,
        'You cannot remove your own account',
      ),
    ).toThrow(ForbiddenException);
  });
});
