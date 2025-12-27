import { IUseCase } from '../../../../shared/application/use-case.interface';
import { UpdateNotificationInput } from './updateNotification.input';
import { INotificationRepository } from '../../../domain/notification.repository';
import { badRequestResponse, errorResponse, successResponse, type HttpResponse } from '../../../../shared/contracts/httpContracts';
import { NotificationId } from '../../../domain';
import { NotificationOutputMapper, type CreateNotificationOutput } from '../../common/notification.output';

export class UpdateNotificationUseCase
  implements IUseCase<UpdateNotificationInput, UpdateNotificationOutput>
{
  constructor(private readonly notificationRepository: INotificationRepository) {}

  async execute(input: UpdateNotificationInput): Promise<HttpResponse<UpdateNotificationOutput | any>> {
    try {
      const notificationId = new NotificationId(input.id);
      const notification = await this.notificationRepository.findById(notificationId);

      if (!notification) {
        return badRequestResponse({ message: `Notificação ${input.id} não encontrada.` });
      }

      await this.notificationRepository.update(notification);

      return successResponse(NotificationOutputMapper.toOutput(notification));
    } catch (error: any) {
      return errorResponse(error);
    }
  }
}

export type UpdateNotificationOutput = CreateNotificationOutput;
