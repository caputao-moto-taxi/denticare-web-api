import { Notification } from "../../domain";

export type CreateNotificationOutput = {
  id: string;
  type: string;
  receipts: string[];
  title: string;
  body: string;
  scheduledAt?: Date;
  sentAt?: Date;
  applicationId: string;
  reScheduledAt?: Date;
  status: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export class NotificationOutputMapper {
  static toOutput(entity: Notification): CreateNotificationOutput {
    const json = entity.toJSON();
    return {
      ...json,
      id: json.id.toString(),
    };
  }
}