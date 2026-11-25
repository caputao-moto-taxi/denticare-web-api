import { BadRequestException, ForbiddenException } from '@nestjs/common';
import {
  UserPermissionData,
  UserPermissionOverride,
  UserPermissionView,
} from '../domain/user.repository';

export class UserPermissionsPolicy {
  static toViews(data: UserPermissionData): UserPermissionView[] {
    const rolePermissions = new Set(data.rolePermissionSlugs);
    const userOverrides = new Map(
      data.overrides.map(({ slug, granted }) => [slug, granted]),
    );
    const isAdmin =
      data.roleSlug === 'admin' || data.roleSlug === 'administrator';

    return data.permissions.map((permission) => {
      const roleDefault = isAdmin || rolePermissions.has(permission.slug);
      const overridden = userOverrides.has(permission.slug);
      return {
        ...permission,
        roleDefault,
        overridden,
        granted: isAdmin
          ? true
          : (userOverrides.get(permission.slug) ?? roleDefault),
      };
    });
  }

  static createOverrides(
    data: UserPermissionData,
    userId: string,
    requestedPermissions: string[],
  ): UserPermissionOverride[] {
    if (data.roleSlug === 'admin' || data.roleSlug === 'administrator') {
      throw new ForbiddenException(
        'Administrator permissions cannot be modified',
      );
    }

    const requested = new Set(requestedPermissions);
    const knownPermissions = new Set(data.permissions.map(({ slug }) => slug));
    const unknown = [...requested].filter(
      (slug) => !knownPermissions.has(slug),
    );
    if (unknown.length > 0) {
      throw new BadRequestException(
        `Unknown permissions: ${unknown.join(', ')}`,
      );
    }

    const rolePermissions = new Set(data.rolePermissionSlugs);
    return data.permissions.flatMap((permission) => {
      const granted = requested.has(permission.slug);
      return granted === rolePermissions.has(permission.slug)
        ? []
        : [{ userId, permissionId: permission.id, granted }];
    });
  }
}
