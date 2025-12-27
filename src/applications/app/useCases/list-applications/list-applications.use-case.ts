import { PaginationOutput } from '../../../../shared/application/pagination-output';
import { IUseCase } from '../../../../shared/application/use-case.interface';
import { successResponse, type HttpResponse } from '../../../../shared/contracts/httpContracts';
import { SortDirection } from '../../../../shared/domain/repository/search-params';
import {
  ApplicationSearchParams,
  IApplicationRepository,
  ApplicationFilter,
} from '../../../domain/application.repository';
import { CreateApplicationOutput } from '../common/applications-output';

export class ListApplicationUseCase
  implements IUseCase<ListApplicationInput, ListApplicationOutput>
{
  constructor(private applicationRepository: IApplicationRepository) {}

  async execute(input: ListApplicationInput): Promise<HttpResponse<ListApplicationOutput>> {
    const params = new ApplicationSearchParams(input);
    const searchResult = await this.applicationRepository.search(params);
    return successResponse(searchResult.toJSON());
  }
}

export type ListApplicationInput = {
  page?: number;
  perPage?: number;
  sort?: string | null;
  sortDir?: SortDirection | null;
  filter?: ApplicationFilter | null;
};

export type ListApplicationOutput = PaginationOutput<CreateApplicationOutput>;
