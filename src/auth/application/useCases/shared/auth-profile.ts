import { AuthProfileRecord } from '../../../domain/auth.repository';
import { PERMISSION_CATALOG } from '../../../permissions';

export function getAuthAccountDisplayName(
  person: Array<{ firstName: string; lastName: string }>,
) {
  const first = person[0];
  return [first?.firstName, first?.lastName].filter(Boolean).join(' ');
}

export function toPublicAuthProfile(user: AuthProfileRecord) {
  const person = user.Person[0];
  const role = user.Role?.slug;

  return {
    id: user.id,
    name: [person?.firstName, person?.lastName].filter(Boolean).join(' '),
    email: user.email,
    phone: person?.phoneNumber ?? '',
    role:
      role === 'platform_owner'
        ? 'platform_owner'
        : role === 'administrator' || role === 'admin'
          ? 'admin'
          : role === 'doctor' || role === 'nurse'
            ? role
            : 'secretary',
    avatar: person?.avatar?.startsWith(`users/${user.id}/avatar/`)
      ? '/auth/me/avatar'
      : '',
    permissions: resolvePermissions(
      role ?? 'staff',
      user.Role?.RolePermission.map(
        (assignment) => assignment.permission.slug,
      ) ?? [],
      user.UserPermission.map((override) => ({
        slug: override.permission.slug,
        granted: override.granted,
      })),
    ),
  };
}

export function resolvePermissions(
  role: string,
  rolePermissions: string[],
  userOverrides: { slug: string; granted: boolean }[],
) {
  if (role === 'admin' || role === 'administrator') {
    return PERMISSION_CATALOG.map(({ slug }) => slug);
  }

  const effective = new Set(rolePermissions);
  for (const override of userOverrides) {
    if (override.granted) effective.add(override.slug);
    else effective.delete(override.slug);
  }

  return PERMISSION_CATALOG.filter(({ slug }) => effective.has(slug)).map(
    ({ slug }) => slug,
  );
}

export function isProfileAvatarKey(userId: string, storageKey: string) {
  return storageKey.startsWith(`users/${userId}/avatar/`);
}
