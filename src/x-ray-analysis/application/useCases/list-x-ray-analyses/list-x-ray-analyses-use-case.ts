import { AuthUser } from '../../../../auth/auth-user';
import { ListQuery } from '../../../../shared/domain/list-query';
import { validateListFilters } from '../../../../shared/helpers/list-filters';
import { XRAY_TYPES } from '../../../domain/x-ray-analysis.entity';
import { IXRayAnalysisRepository } from '../../../domain/x-ray-analysis.repository';
import { XRayAnalysisAccessPolicy } from '../../x-ray-analysis-access.policy';

export type ListXRayAnalysesInput = { user: AuthUser; query: ListQuery };

export class ListXRayAnalysesUseCase {
  constructor(private readonly repository: IXRayAnalysisRepository) {}

  execute({ user, query }: ListXRayAnalysesInput) {
    XRayAnalysisAccessPolicy.ensureCanAccess(user);
    validateListFilters(query, { type: XRAY_TYPES });
    return this.repository.list(user, query);
  }
}
