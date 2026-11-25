import { Injectable } from '@nestjs/common';
import { AuthUser } from '../../auth/auth-user';
import {
  IPlatformAdminRepository,
  clinicStatusAction,
  userStatusAction,
} from '../domain/platform-admin.repository';
import {
  PlatformClinicFilterDto,
  UpdatePlatformClinicDto,
} from '../infra/http/platform-admin.dto';
import { clinicUpdateChanges } from './platform-admin-policies';

@Injectable()
export class PlatformAdminService {
  constructor(private readonly repository: IPlatformAdminRepository) {}

  overview() {
    return this.repository.overview();
  }

  listClinics(filter: PlatformClinicFilterDto) {
    return this.repository.listClinics(filter);
  }

  clinicDetails(clinicId: string) {
    return this.repository.clinicDetails(clinicId);
  }

  updateClinic(
    clinicId: string,
    actor: AuthUser,
    input: UpdatePlatformClinicDto,
  ) {
    return this.repository.updateClinic(
      clinicId,
      actor,
      clinicUpdateChanges(input),
    );
  }

  setClinicStatus(clinicId: string, actor: AuthUser, isActive: boolean) {
    return this.repository.setClinicStatus(
      clinicId,
      actor,
      isActive,
      clinicStatusAction(isActive),
    );
  }

  setUserStatus(
    clinicId: string,
    userId: string,
    actor: AuthUser,
    isActive: boolean,
  ) {
    return this.repository.setUserStatus(
      clinicId,
      userId,
      actor,
      isActive,
      userStatusAction(isActive),
    );
  }
}
