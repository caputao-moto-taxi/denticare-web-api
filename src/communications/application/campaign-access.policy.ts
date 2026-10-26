import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AuthUser } from '../../auth/auth-user';

export function requireCampaignAdmin(user: AuthUser) {
  if (user.role !== 'admin' && user.role !== 'administrator') {
    throw new ForbiddenException(
      'Only clinic administrators can manage campaigns',
    );
  }
  if (!user.branchId) throw new NotFoundException('Clinic branch not found');
  return user.branchId;
}

export function requirePatientAccount(user: AuthUser) {
  if (user.role !== 'patient') {
    throw new ForbiddenException('Only patients can manage their consents');
  }
  if (!user.branchId) throw new NotFoundException('Patient profile not found');
  return user.branchId;
}
