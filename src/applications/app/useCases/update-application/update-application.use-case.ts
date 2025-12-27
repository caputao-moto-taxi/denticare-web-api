import { IUseCase } from '../../../../shared/application/use-case.interface';
import { UpdateApplicationInput } from './update-application.input';
import { IApplicationRepository } from '../../../domain/application.repository';
import { Application, ApplicationId } from '../../../domain/application.aggregate';
import {
  ApplicationOutputMapper,
  CreateApplicationOutput,
} from '../common/applications-output';
import type { ApplicationVersionStatus } from '@prisma/client';
import { badRequestResponse, errorResponse, successResponse, type HttpResponse } from '../../../../shared/contracts/httpContracts';

export class UpdateApplicationUseCase
  implements IUseCase<UpdateApplicationInput, UpdateApplicationOutput>
{
  constructor(private readonly applicationRepository: IApplicationRepository) {}

  async execute(input: UpdateApplicationInput): Promise<HttpResponse<UpdateApplicationOutput | any>> {
    try {
      const applicationId = new ApplicationId(input.id);
      const application = await this.applicationRepository.findById(applicationId);
  
      if (!application) {
        return badRequestResponse({ message: `${input.id}, ${Application}`});
      }
  
      if (input.name) {
        application.name = input.name;
        }
  
      if (input.versionStatus) {
        application.versionStatus = input.versionStatus as ApplicationVersionStatus;
      }
  
      await this.applicationRepository.update(application);
  
      return successResponse(ApplicationOutputMapper.toOutput(application));
    }catch (error: any) {
      return errorResponse(error);
    }
  }
}

export type UpdateApplicationOutput = CreateApplicationOutput;
