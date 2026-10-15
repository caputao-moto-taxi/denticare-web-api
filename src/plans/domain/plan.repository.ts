import { ISearchableRepository } from '../../shared/domain/repository/repository-interface';
import { SearchParams } from '../../shared/domain/repository/search-params';
import { SearchResult } from '../../shared/domain/repository/search-result';
import { Plan, PlanId } from './plan.aggregate';
import { ListQuery, paginated } from '../../shared/domain/list-query';

export type PlanFilter = string;

export class PlanSearchParams extends SearchParams<PlanFilter> {}

export class PlanSearchResult extends SearchResult {}

export interface IPlanRepository extends ISearchableRepository<
  Plan,
  PlanId,
  PlanFilter,
  PlanSearchParams,
  PlanSearchResult
> {
  listPaginated(query: ListQuery): Promise<ReturnType<typeof paginated>>;
}
