import { ISearchableRepository } from '../../shared/domain/repository/repository-interface';
import { SearchParams } from '../../shared/domain/repository/search-params';
import { SearchResult } from '../../shared/domain/repository/search-result';
import { Plan, PlanId } from './plan.aggregate';
import { ListQuery, paginated } from '../../shared/domain/list-query';

export type PlanFilter = string;

export class PlanSearchParams extends SearchParams<PlanFilter> {}

export class PlanSearchResult extends SearchResult {}

export type PlanPromotionUpdate = {
  isOnPromotion: boolean;
  promotionalPrice: number | null;
  promotionalStartAt: Date | null;
  promotionalEndAt: Date | null;
};

export type PlanDetailsUpdate = {
  name: string;
  price: number;
  currencyId: string;
  duration: number;
  totalBranch: number;
};

export type AddPlanBenefitInput = {
  name: string;
  details: string | null;
};

export type PlanBenefitOutput = {
  id: string;
  benefit: { id: string; name: string; details: string | null };
};

export type PlanCurrency = {
  id: string;
  name: string;
  symbol: string;
};

export interface IPlanRepository extends ISearchableRepository<
  Plan,
  PlanId,
  PlanFilter,
  PlanSearchParams,
  PlanSearchResult
> {
  listPaginated(query: ListQuery): Promise<ReturnType<typeof paginated>>;
  listCurrencies(): Promise<PlanCurrency[]>;
  updatePromotion(id: PlanId, promotion: PlanPromotionUpdate): Promise<void>;
  updateDetails(id: PlanId, details: PlanDetailsUpdate): Promise<void>;
  addBenefit(
    id: PlanId,
    benefit: AddPlanBenefitInput,
  ): Promise<PlanBenefitOutput>;
}
