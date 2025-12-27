import { IUseCase } from '../../../../shared/application/use-case.interface';
import { badRequestResponse, errorResponse, successResponse, HttpResponse } from '../../../../shared/contracts/httpContracts';
import { NotFoundError } from '../../../../shared/domain/errors/not-found.error';
import { NotificationId, INotificationRepository } from '../../../domain';
import { CreateNotificationOutput, NotificationOutputMapper } from '../../common/notification.output';

export type GetNotificationInput = {
  id: string;
};

export class GetNotificationUseCase
  implements IUseCase<GetNotificationInput, GetNotificationOutput>
{
  constructor(private notificationRepository: INotificationRepository) {}

  async execute(input: GetNotificationInput): Promise<HttpResponse<GetNotificationOutput | any>> {
    try {
      const notificationId = new NotificationId(input.id);
      const notification = await this.notificationRepository.findById(notificationId);

      if (!notification) {
        return badRequestResponse({ message: `${ new NotFoundError(input.id, Notification)}` });
      }

      return successResponse(NotificationOutputMapper.toOutput(notification));
    }catch(error: any) {
      return errorResponse(error);
    }
  }
}

export type GetNotificationOutput = CreateNotificationOutput;
