import { ISearchableRepository } from '../../shared/domain/repository/repository-interface';
import { SearchParams } from '../../shared/domain/repository/search-params';
import { SearchResult } from '../../shared/domain/repository/search-result';
import { Application, ApplicationId } from './application.aggregate';

export type ApplicationFilter = string;

export class ApplicationSearchParams extends SearchParams<ApplicationFilter> {}

export class ApplicationSearchResult extends SearchResult {}

export interface IApplicationRepository
  extends ISearchableRepository<
    Application,
    ApplicationId,
    ApplicationFilter,
    ApplicationSearchParams,
    ApplicationSearchResult
  > {
  findByName(name: string): Promise<Application | null>;
}
