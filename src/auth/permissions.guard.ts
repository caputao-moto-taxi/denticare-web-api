import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthenticatedRequest } from './auth-user';
import { PERMISSION_METADATA_KEY, PermissionSlug } from './permissions';
import { CheckPermissionsUseCase } from './application/useCases/check-permissions/check-permissions-use-case';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly checkPermissions: CheckPermissionsUseCase,
  ) {}

  canActivate(context: ExecutionContext) {
    const required = this.reflector.getAllAndOverride<PermissionSlug[]>(
      PERMISSION_METADATA_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required?.length) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (
      this.checkPermissions.execute({
        user: request.user,
        requiredPermissions: required,
      })
    ) {
      return true;
    }
    throw new ForbiddenException('Insufficient permissions');
  }
}
