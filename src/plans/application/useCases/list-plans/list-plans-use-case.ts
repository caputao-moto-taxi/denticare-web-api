import { BadRequestException } from '@nestjs/common';
import { IUseCase } from '../../../../shared/application/use-case.interface';
import {
  successResponse,
  HttpResponse,
} from '../../../../shared/contracts/httpContracts';
import { IPlanRepository } from '../../../domain';
import { ListQuery } from '../../../../shared/domain/list-query';
import { validateListFilters } from '../../../../shared/helpers/list-filters';

type ListPlansOutput = Awaited<ReturnType<IPlanRepository['listPaginated']>>;

export class ListPlansUseCase implements IUseCase<ListQuery, ListPlansOutput> {
  constructor(private _repository: IPlanRepository) {}

  async execute(query: ListQuery): Promise<HttpResponse<ListPlansOutput>> {
    validateListFilters(query);
    if (query.dateFrom && query.dateTo && query.dateFrom > query.dateTo) {
      throw new BadRequestException('Start date must not be after end date');
    }
    return successResponse(await this._repository.listPaginated(query));
  }
}
