import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { AuthUser } from '../../auth/auth-user';
import { TreatmentPlanPolicy } from './treatment-plan.policy';

describe('TreatmentPlanPolicy', () => {
  const user: AuthUser = {
    id: 'user-1',
    email: 'user@example.test',
    role: 'doctor',
    branchId: 'branch-1',
  };

  it('allows clinical roles to manage plans and denies roles without permission', () => {
    expect(() => TreatmentPlanPolicy.ensureCanManage(user)).not.toThrow();
    expect(() =>
      TreatmentPlanPolicy.ensureCanManage({ ...user, role: 'nurse' }),
    ).toThrow(ForbiddenException);
    expect(() =>
      TreatmentPlanPolicy.ensureCanRecordProgress({
        ...user,
        role: 'nurse',
      }),
    ).not.toThrow();
  });

  it('rejects dates and progress that violate plan bounds', () => {
    expect(() =>
      TreatmentPlanPolicy.validateDates(
        new Date('2026-03-01'),
        new Date('2026-02-28'),
      ),
    ).toThrow(BadRequestException);
    expect(() => TreatmentPlanPolicy.ensureProgressWithinPlan(6, 5)).toThrow(
      BadRequestException,
    );
    expect(() =>
      TreatmentPlanPolicy.ensureTotalStepsNotBelowProgress(1, 2),
    ).toThrow(BadRequestException);
  });
});
