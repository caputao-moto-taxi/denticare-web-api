import { IUseCase } from '../../../../shared/application/use-case.interface';
import {
  errorResponse,
  successResponse,
  HttpResponse,
} from '../../../../shared/contracts/httpContracts';
import { IPlanRepository } from '../../../domain';

export class ListPlansUseCase implements IUseCase<any, undefined> {
  constructor(private _repository: IPlanRepository) { }

  async execute(_: any): Promise<HttpResponse<any>> {
    try {
      const searchPlans = await this._repository.findAll();

      return successResponse(searchPlans);
    } catch (error: any) {
      return errorResponse(error);
    }
  }
}
