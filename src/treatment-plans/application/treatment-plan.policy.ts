import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { AuthUser } from '../../auth/auth-user';
import { STAFF_ROLES } from '../../shared/helpers/staff';

const MANAGEMENT_ROLES = new Set(['admin', 'doctor']);
const PROGRESS_ROLES = new Set(['admin', 'doctor', 'nurse']);

export class TreatmentPlanPolicy {
  static ensureCanView(user: AuthUser) {
    if (!STAFF_ROLES.has(user.role)) {
      throw new ForbiddenException(
        'You do not have permission for this treatment plan action',
      );
    }
  }

  static ensureCanManage(user: AuthUser) {
    if (!MANAGEMENT_ROLES.has(user.role)) {
      throw new ForbiddenException(
        'You do not have permission for this treatment plan action',
      );
    }
  }

  static ensureCanRecordProgress(user: AuthUser) {
    if (!PROGRESS_ROLES.has(user.role)) {
      throw new ForbiddenException(
        'You do not have permission for this treatment plan action',
      );
    }
  }

  static ensureCanDelete(user: AuthUser) {
    if (user.role !== 'admin') {
      throw new ForbiddenException(
        'You do not have permission for this treatment plan action',
      );
    }
  }

  static validateDates(startDate: Date, estimatedCompletion: Date | null) {
    if (estimatedCompletion && estimatedCompletion < startDate) {
      throw new BadRequestException(
        'Estimated completion cannot be before the plan start date',
      );
    }
  }

  static ensureProgressWithinPlan(completedSteps: number, totalSteps: number) {
    if (completedSteps > totalSteps) {
      throw new BadRequestException(
        'Completed steps cannot exceed the total steps',
      );
    }
  }

  static ensureTotalStepsNotBelowProgress(
    totalSteps: number,
    completedSteps: number,
  ) {
    if (totalSteps < completedSteps) {
      throw new BadRequestException(
        'Total steps cannot be lower than the completed steps',
      );
    }
  }
}
