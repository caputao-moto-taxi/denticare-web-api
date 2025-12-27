import { PaginationOutput } from "../../../../shared/application/pagination-output";
import { IUseCase } from "../../../../shared/application/use-case.interface";
import {
  errorResponse,
  successResponse,
  HttpResponse,
} from "../../../../shared/contracts/httpContracts";
import { SortDirection } from "../../../../shared/domain/repository/search-params";
import {
  NotificationSearchParams,
  INotificationRepository,
  NotificationFilter,
} from "../../../domain";
import { CreateNotificationOutput } from "../../common/notification.output";

export class ListNotificationsUseCase
  implements IUseCase<ListNotificationsInput, ListNotificationsOutput>
{
  constructor(private notificationRepository: INotificationRepository) {}

  async execute(
    input: ListNotificationsInput
  ): Promise<HttpResponse<ListNotificationsOutput>> {
    try {
      const params = new NotificationSearchParams(input);
      const searchResult = await this.notificationRepository.search(params);
      return successResponse(searchResult.toJSON());
    } catch (error: any) {
      return errorResponse(error);
    }
  }
}

export type ListNotificationsInput = {
  page?: number;
  perPage?: number;
  sort?: string | null;
  sortDir?: SortDirection | null;
  filter?: NotificationFilter | null;
};

export type ListNotificationsOutput =
  PaginationOutput<CreateNotificationOutput>;
