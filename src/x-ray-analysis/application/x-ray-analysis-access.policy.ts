import { ForbiddenException } from '@nestjs/common';
import { AuthUser } from '../../auth/auth-user';

const XRAY_STAFF_ROLES = new Set(['admin', 'doctor', 'nurse']);

export class XRayAnalysisAccessPolicy {
  static ensureCanAccess(user: AuthUser) {
    if (!XRAY_STAFF_ROLES.has(user.role)) {
      throw new ForbiddenException(
        'Only clinical staff may access X-ray analyses',
      );
    }
  }
}
