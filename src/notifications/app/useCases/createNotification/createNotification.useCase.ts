import { NotificationStatus, TypeNotification } from "@prisma/client";
import { IUseCase } from "../../../../shared/application/use-case.interface";
import {
  badRequestResponse,
  errorResponse,
  HttpResponse,
  successResponse,
} from "../../../../shared/contracts/httpContracts";
import { EntityValidationError } from "../../../../shared/domain/validators/validation.error";
import { ErrorMessages } from "../../../../shared/helpers/errorMessages";
import { ReadHTMLFile } from "../../../../shared/helpers/utils";
import { SendEmailNotificationService } from "../../../../shared/infra/services/sendEmailNotification.service";
import { SendSMSNotification } from "../../../../shared/infra/services/sendSMSNotification.service";
import { SendPushNotificationService } from "../../../../shared/infra/services/sendPushNotification.service";
import { SendDiscordNotificationService } from "../../../../shared/infra/services/sendDiscordNotification.service";
import { join } from "path";
import { validateEmails } from "../../../../shared/helpers/isValidEmail";
import {
  INotificationRepository,
  Notification,
  NotificationId,
} from "../../../domain";
import {
  CreateNotificationOutput,
  NotificationOutputMapper,
} from "../../common/notification.output";
import {
  CreateNotificationInput,
  SaveInternalNotificationProps,
} from "./notification.input";
import * as dayjs from "dayjs";
import { LogsId, type Logs } from "../../../../logs/domain";

export class CreateNotificationUseCase
  implements IUseCase<CreateNotificationInput, CreateNotificationOutput>
{
  constructor(
    private readonly notificationRepository: INotificationRepository
  ) {}

  async execute(
    input: CreateNotificationInput
  ): Promise<HttpResponse<CreateNotificationOutput | any>> {
    if (
      input.type === TypeNotification.EMAIL &&
      !validateEmails(input.receipts as any)
    ) {
      return badRequestResponse({ message: ErrorMessages.INVALID_EMAIL });
    }

    if(input.type !== TypeNotification.EMAIL && validateEmails(input.receipts as any)){
      return badRequestResponse({ message: ErrorMessages.INVALID_EMAIL });
    }

    const application = await this.notificationRepository.findApplicationByKey(
      input.apiKey
    );
    if (!application) {
      return badRequestResponse({
        message: ErrorMessages.INVALID_KEY_OR_APPLICATION_NOT_FOUND,
      });
    }

    const notificationProps: SaveInternalNotificationProps = {
      id: new NotificationId().value,
      applicationId: String(application.id),
      type: input.type,
      title: input.title,
      body: input.body,
      receipts: input.receipts,
      scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
      reScheduledAt: input.reScheduledAt,
      status: NotificationStatus.SENT,
    };

    try {
      if (input.scheduledAt && dayjs(input.scheduledAt).isAfter(dayjs())) {
        notificationProps.status = NotificationStatus.ScHEDULED;
        return this.saveNotification(notificationProps);
      }

      await this.sendNotification(input, notificationProps.id);
      return this.saveNotification(notificationProps);
    } catch (error: any) {
      if (error instanceof EntityValidationError) {
        return errorResponse(error);
      }
      return errorResponse(error);
    }
  }

  private async saveNotification(notification: SaveInternalNotificationProps) {
    const newNotification = Notification.create({
      applicationId: notification.applicationId,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      receipts: notification.receipts,
      scheduledAt: notification.scheduledAt,
      reScheduledAt: notification.reScheduledAt,
      sentAt:
        notification.status === NotificationStatus.SENT
          ? new Date()
          : undefined,
      status: notification.status,
    });

    if (newNotification.notification.hasErrors()) {
      return badRequestResponse({
        message: `${newNotification.notification.toJSON()}`,
      });
    }

    await this.notificationRepository.insert(newNotification);
    return successResponse(NotificationOutputMapper.toOutput(newNotification));
  }

  private async sendNotification(
    input: CreateNotificationInput,
    notificationId: string
  ): Promise<void> {
    const logError = async (
      message: string,
      error: any,
      type: TypeNotification
    ) => {
      const existingLog =
        await this.notificationRepository.findLogsByNotificationId(
          notificationId
        );
      const retryCount = existingLog?.retry_count ?? 0;

      await this.insertLog({
        message,
        type,
        statusCode: 500,
        retryCount: retryCount + 1,
        error: error.message || JSON.stringify(error),
        notificationId,
      });
    };
    switch (input.type) {
      case TypeNotification.SMS:
        try {
          await this.sendBulkSMS(input.receipts as any, input.body);
        } catch (error) {
          await logError("Erro ao enviar SMS", error, TypeNotification.SMS);
        }
      case TypeNotification.EMAIL:
        try {
          await this.sendBulkEmail(
            input.receipts as any,
            input.title,
            input.body
          );
        } catch (error) {
          await logError("Erro ao enviar Email", error, TypeNotification.EMAIL);
        }
        break;

      case TypeNotification.PUSH:
        try {
          await this.sendBulkPush(
            input.receipts as any,
            input.title,
            input.body
          );
        } catch (error) {
          await logError(
            "Erro ao enviar Push Notification",
            error,
            TypeNotification.PUSH
          );
        }
        break;

      case TypeNotification.DISCORD:
        try {
          await this.sendDiscordMessage(input.receipts as any, input.body);
          console.log("push notification sent to Discord");
        } catch (error) {
          await logError(
            "Erro ao enviar Discord Message",
            error,
            TypeNotification.DISCORD
          );
        }
        break;

      default:
        throw new Error(ErrorMessages.INVALID_NOTIFICATION_TYPE);
    }
  }

  private async sendBulkSMS(recipients: string[] | string, body: string) {
    const smsService = new SendSMSNotification();
    const response = await smsService.execute({ to: recipients, body });

    if (response.status !== 200) {
      return response.data;
    }

    return response;
  }

  private async sendBulkEmail(
    recipients: string[] | string,
    subject: string,
    html: string
  ) {
    const emailService = new SendEmailNotificationService();
    const toList = Array.isArray(recipients) ? recipients : [recipients];

    await Promise.all(
      toList.map(async (email) => {
        const htmlContent = await ReadHTMLFile(
          join("dist", "public", "email-template.html"),
          { subject, email, body: html, year: new Date().getFullYear() }
        );
        return emailService.execute([email], subject, htmlContent);
      })
    );
  }

  private async sendBulkPush(
    recipients: string[] | string,
    title: string,
    body: string
  ) {
    const pushService = new SendPushNotificationService();
    const toList = Array.isArray(recipients) ? recipients : [recipients];
    await Promise.all(
      toList.map((token) => pushService.execute(token, title, body))
    );
  }

  private async sendDiscordMessage(
    recipients: string[] | string,
    content: string
  ) {
    const discordService = new SendDiscordNotificationService();
    const channels = Array.isArray(recipients) ? recipients : [recipients];
    await Promise.all(
      channels.map((channelName) =>
        discordService.execute({ channelName, content })
      )
    );
  }

  protected async insertLog(props: {
    message: string;
    type: TypeNotification;
    statusCode: number;
    retryCount: number;
    error: string;
    notificationId: string;
  }) {
    const log = {
      id: new LogsId(),
      message: props.message,
      type: props.type,
      statusCode: props.statusCode,
      retryCount: props.retryCount,
      error: props.error,
      notificationId: props.notificationId,
      timestamp: new Date(),
    };

    await this.notificationRepository.insertLog(log);
  }
}
