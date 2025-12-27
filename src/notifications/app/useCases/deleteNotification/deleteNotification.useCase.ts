import { IUseCase } from '../../../../shared/application/use-case.interface';
import { badRequestResponse, HttpResponse, successResponse } from '../../../../shared/contracts/httpContracts';
import { NotFoundError } from '../../../../shared/domain/errors/not-found.error';
import { Notification, NotificationId, INotificationRepository } from '../../../domain';

export class DeleteNotificationUseCase
  implements IUseCase<DeleteNotificationInput, DeleteNotificationOutput>
{
  constructor(private notificationRepository: INotificationRepository) {}

  async execute(input: DeleteNotificationInput): Promise<HttpResponse<DeleteNotificationOutput | any>> {
      const notificationById = new NotificationId(input.id);
      const notification = await this.notificationRepository.findById(notificationById);
  
      if (!notification) {
        return badRequestResponse({ message: `${ new NotFoundError(input.id, Notification)}` });
      }
  
      return successResponse(await this.notificationRepository.delete(notificationById));
  }
}

export type DeleteNotificationInput = {
  id: string;
};

export type DeleteNotificationOutput = void;
