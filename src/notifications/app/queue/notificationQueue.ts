import { Injectable } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { INotificationRepository, Notification } from "../../domain";
import { NotificationStatus, TypeNotification } from "@prisma/client";
import { ErrorMessages } from "../../../shared/helpers/errorMessages";
import { SendSMSNotification } from "../../../shared/infra/services/sendSMSNotification.service";
import { SendEmailNotificationService } from "../../../shared/infra/services/sendEmailNotification.service";
import { ReadHTMLFile } from "../../../shared/helpers/utils";
import { join } from "path";
import { SendPushNotificationService } from "../../../shared/infra/services/sendPushNotification.service";
import { SendDiscordNotificationService } from "../../../shared/infra/services/sendDiscordNotification.service";

export class ScheduledNotificationsService {
  constructor(private readonly notificationRepository: INotificationRepository) {}

  @Cron('* * * * *')
  async handleScheduledNotifications() {
    console.log('[CRON] Running scheduled notifications at', new Date().toISOString());

    const now = new Date();
    const scheduledNotifications = await this.notificationRepository.findScheduledNotifications(now);

    for (const notification of scheduledNotifications) {
      try {
        await this.sendNotification(notification);
        notification.status = NotificationStatus.SENT;
      } catch (error) {
        console.error('Error sending scheduled notification:', error);
        notification.status = NotificationStatus.FAILED;
      }
      await this.notificationRepository.updateStatus(notification.id.value, notification.status);
    }
  }

  private async sendNotification(notification: Notification) {
    switch (notification.type) {
      case TypeNotification.SMS:
        await this.sendBulkSMS(notification.receipts, notification.body);
        break;
      case TypeNotification.EMAIL:
        await this.sendBulkEmail(notification.receipts, notification.title, notification.body);
        break;
      case TypeNotification.PUSH:
        await this.sendBulkPush(notification.receipts, notification.title, notification.body);
        break;
      case TypeNotification.DISCORD:
        await this.sendDiscordMessage(notification.receipts, notification.body);
        break;
      default:
        throw new Error(ErrorMessages.INVALID_NOTIFICATION_TYPE);
    }
  }

  private async sendBulkSMS(recipients: string[] | string, body: string) {
    const smsService = new SendSMSNotification();
    const toList = Array.isArray(recipients) ? recipients : [recipients];
    await Promise.all(toList.map((to) => smsService.execute({ to, body })));
  }

  private async sendBulkEmail(recipients: string[] | string, subject: string, html: string) {
    const emailService = new SendEmailNotificationService();
    const toList = Array.isArray(recipients) ? recipients : [recipients];

    await Promise.all(
      toList.map(async (email) => {
        const htmlContent = await ReadHTMLFile(
          join('dist', 'public', 'email-template.html'),
          { subject, email, body: html, year: new Date().getFullYear() }
        );
        return emailService.execute([email], subject, htmlContent);
      })
    );
  }

  private async sendBulkPush(recipients: string[] | string, title: string, body: string) {
    const pushService = new SendPushNotificationService();
    const toList = Array.isArray(recipients) ? recipients : [recipients];
    await Promise.all(toList.map((token) => pushService.execute(token, title, body)));
  }

  private async sendDiscordMessage(recipients: string[] | string, content: string) {
    const discordService = new SendDiscordNotificationService();
    const channels = Array.isArray(recipients) ? recipients : [recipients];
    await Promise.all(channels.map((channelName) => discordService.execute({ channelName, content })));
  }
}
