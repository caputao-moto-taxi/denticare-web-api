import { IUseCase } from '../../../../shared/application/use-case.interface';
import { HttpResponse, successResponse } from '../../../../shared/contracts/httpContracts';
import { NotFoundError } from '../../../../shared/domain/errors/not-found.error';
import { Application, ApplicationId } from '../../../domain/application.aggregate';
import { IApplicationRepository } from '../../../domain/application.repository';
import {} from '../common/applications-output';

export class DeleteApplicationUseCase
  implements IUseCase<DeleteApplicationInput, DeleteApplicationOutput>
{
  constructor(private applicationRepository: IApplicationRepository) {}

  async execute(input: DeleteApplicationInput): Promise<HttpResponse<DeleteApplicationOutput>> {
      const applicationId = new ApplicationId(input.id);
      const application = await this.applicationRepository.findById(applicationId);
  
      if (!application) {
        throw new NotFoundError(input.id, Application);
      }
  
      return successResponse(await this.applicationRepository.delete(applicationId));
  }
}

export type DeleteApplicationInput = {
  id: string;
};

export type DeleteApplicationOutput = void;
