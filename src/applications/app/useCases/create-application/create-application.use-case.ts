import { IUseCase } from '../../../../shared/application/use-case.interface';
import { EntityValidationError } from '../../../../shared/domain/validators/validation.error';
import {
  ApplicationOutputMapper,
  CreateApplicationOutput,
} from '../common/applications-output';

import { Application } from '../../../domain/application.aggregate';
import { CreateApplicationInput } from './application.input';
import { IApplicationRepository } from '../../../domain/application.repository';
import { GenerateApiKey } from '../../../../shared/application/generate-api-key';
import { ApplicationVersionStatus } from '@prisma/client';
import { badRequestResponse, errorResponse, successResponse } from '../../../../shared/contracts/httpContracts';
import { ErrorMessages } from '../../../../shared/helpers/errorMessages';

export class CreateApplicationUseCase
  implements IUseCase<CreateApplicationInput, CreateApplicationOutput>
{
  constructor(private readonly applicationRepository: IApplicationRepository) {}

  async execute(input: CreateApplicationInput): Promise<any> {
    try {
      const application = await this.applicationRepository.findByName(input.name);
   
    if(application && application.versionStatus === input.versionStatus) {
      return badRequestResponse({ message: ErrorMessages.APPLICATION_ALREADY_EXISTS })
    }

    const generateApiKey = GenerateApiKey();

    const newApplication = Application.create({
      name: input.name,
      versionStatus: input.versionStatus as ApplicationVersionStatus,
      apiKey: generateApiKey,
      refreshApiKey: generateApiKey,
    });

    if (newApplication.notification.hasErrors()) {
      return badRequestResponse({ message: `${newApplication.notification.toJSON()}` })
    }

    await this.applicationRepository.insert(newApplication);

    return successResponse(ApplicationOutputMapper.toOutput(newApplication));

    } catch (error: any) {
      return errorResponse(error);
    }
  }
}

// export type CreateCategoryOutput = CreateApplicationOutput;
