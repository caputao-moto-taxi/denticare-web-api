import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { AuthenticatedRequest } from '../../../auth/auth-user';

@Injectable()
export class PlatformOwnerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (request.user?.role !== 'platform_owner') {
      throw new ForbiddenException('Platform owner access is required');
    }
    return true;
  }
}

@Injectable()
export class ClinicAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (request.user?.role !== 'admin') {
      throw new ForbiddenException('Clinic administrator access is required');
    }
    return true;
  }
}
