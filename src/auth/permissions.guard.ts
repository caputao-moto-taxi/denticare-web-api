import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthenticatedRequest } from './auth-user';
import { PERMISSION_METADATA_KEY, PermissionSlug } from './permissions';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    const required = this.reflector.getAllAndOverride<PermissionSlug[]>(
      PERMISSION_METADATA_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required?.length) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;
    if (
      user.role === 'admin' ||
      user.role === 'administrator' ||
      required.some((permission) => user.permissions?.includes(permission))
    ) {
      return true;
    }
    throw new ForbiddenException('Insufficient permissions');
  }
}
