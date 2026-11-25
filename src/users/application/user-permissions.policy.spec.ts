import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { UserPermissionsPolicy } from './user-permissions.policy';

describe('UserPermissionsPolicy', () => {
  const data = {
    roleSlug: 'nurse',
    rolePermissionSlugs: ['patient.read'],
    overrides: [{ slug: 'patient.write', granted: true }],
    permissions: [
      {
        id: 'read-id',
        slug: 'patient.read',
        name: 'Read patients',
        description: '',
      },
      {
        id: 'write-id',
        slug: 'patient.write',
        name: 'Write patients',
        description: '',
      },
    ],
  };

  it('derives effective access from role defaults and explicit overrides', () => {
    expect(UserPermissionsPolicy.toViews(data)).toEqual([
      {
        ...data.permissions[0],
        roleDefault: true,
        overridden: false,
        granted: true,
      },
      {
        ...data.permissions[1],
        roleDefault: false,
        overridden: true,
        granted: true,
      },
    ]);
  });

  it('rejects admin edits and unknown permissions and only persists differences', () => {
    expect(() =>
      UserPermissionsPolicy.createOverrides(
        { ...data, roleSlug: 'admin' },
        'user-1',
        [],
      ),
    ).toThrow(ForbiddenException);
    expect(() =>
      UserPermissionsPolicy.createOverrides(data, 'user-1', ['unknown']),
    ).toThrow(BadRequestException);
    expect(
      UserPermissionsPolicy.createOverrides(data, 'user-1', [
        'patient.read',
        'patient.write',
      ]),
    ).toEqual([{ userId: 'user-1', permissionId: 'write-id', granted: true }]);
  });
});
