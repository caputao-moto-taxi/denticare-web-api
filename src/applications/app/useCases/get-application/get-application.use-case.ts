import { IUseCase } from '../../../../shared/application/use-case.interface';
import { badRequestResponse, errorResponse, successResponse, type HttpResponse } from '../../../../shared/contracts/httpContracts';
import { Application, ApplicationId } from '../../../domain/application.aggregate';
import { IApplicationRepository } from '../../../domain/application.repository';
import {
  ApplicationOutputMapper,
  CreateApplicationOutput,
} from '../common/applications-output';

export type GetApplicationInput = {
  id: string;
};

export class GetApplicationUseCase
  implements IUseCase<GetApplicationInput, GetApplicationOutput>
{
  constructor(private applicationRepository: IApplicationRepository) {}

  async execute(input: GetApplicationInput): Promise<HttpResponse<GetApplicationOutput | any>> {
    try {
      const applicationId = new ApplicationId(input.id);
      const application = await this.applicationRepository.findById(applicationId);

      if (!application) {
        return badRequestResponse({ message: `${input.id, Application}`});
      }

      return successResponse(ApplicationOutputMapper.toOutput(application));
    }catch(error: any) {
      return errorResponse(error);
    }
  }
}

export type GetApplicationOutput = CreateApplicationOutput;
