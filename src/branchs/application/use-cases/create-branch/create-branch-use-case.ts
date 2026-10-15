import { Injectable } from '@nestjs/common';
import type { UseCase } from '../../../../shared/contracts/useCasesOrServicesContract';
import type { HttpResponse } from '../../../../shared/contracts/httpContracts';
import type { IBranchRepository } from '../../../domain/branch-repository';
import type { IHeadquarterRepository } from '../../../domain/headquarter-repository';

@Injectable()
export class CreateBranchUseCase implements UseCase {
  constructor(
    private _headquarterRepository: IHeadquarterRepository,
    private _branchRepository: IBranchRepository,
  ) {}
  execute(request: any): Promise<HttpResponse<any>> {
    throw new Error('Method not implemented.');
  }
}
