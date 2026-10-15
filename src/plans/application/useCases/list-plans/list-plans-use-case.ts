import { IUseCase } from '../../../../shared/application/use-case.interface';
import {
  successResponse,
  HttpResponse,
} from '../../../../shared/contracts/httpContracts';
import { IPlanRepository } from '../../../domain';
import { ListQuery } from '../../../../shared/domain/list-query';

type ListPlansOutput = Awaited<ReturnType<IPlanRepository['listPaginated']>>;

export class ListPlansUseCase implements IUseCase<ListQuery, ListPlansOutput> {
  constructor(private _repository: IPlanRepository) {}

  async execute(query: ListQuery): Promise<HttpResponse<ListPlansOutput>> {
    return successResponse(await this._repository.listPaginated(query));
  }
}
