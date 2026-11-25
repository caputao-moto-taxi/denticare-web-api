import { AuthUser } from '../../../auth-user';
import { PermissionSlug } from '../../../permissions';

export type CheckPermissionsInput = {
  user: AuthUser;
  requiredPermissions: PermissionSlug[];
};

export class CheckPermissionsUseCase {
  execute({ user, requiredPermissions }: CheckPermissionsInput) {
    if (user.role === 'admin' || user.role === 'administrator') {
      return true;
    }

    return requiredPermissions.some((permission) =>
      user.permissions?.includes(permission),
    );
  }
}
