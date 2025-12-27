import { notification_logs as Log } from "@prisma/client";
import { ISearchableRepository } from "../../shared/domain/repository/repository-interface";
import { SearchParams } from "../../shared/domain/repository/search-params";
import { SearchResult } from "../../shared/domain/repository/search-result";
import { NotificationId, Notification } from "./notifications.aggregate";


export type NotificationFilter = string;

export class NotificationSearchParams extends SearchParams<NotificationFilter> {}

export class NotificationSearchResult extends SearchResult {}

export interface INotificationRepository
  extends ISearchableRepository<
  Notification,
  NotificationId,
  NotificationFilter,
  NotificationSearchParams,
  NotificationSearchResult
  > {
  findByApplicationId(applicationId: string): Promise<Notification[]>;
  findByType(type: string): Promise<Notification[]>;
  findByStatus(status: string): Promise<Notification[]>;
  findByScheduledAt(scheduledAt: Date): Promise<Notification[]>;
  findBySentAt(sentAt: Date): Promise<Notification[]>;
  findByReScheduledAt(reScheduledAt: Date): Promise<Notification[]>;
  findByReceipts(receipts: string[]): Promise<Notification[]>;
  findByTitle(title: string): Promise<Notification[]>;
  findByBody(body: string): Promise<Notification[]>;
  findApplicationByKey(key: string): Promise<any>;
  findScheduledNotifications(date: Date): Promise<Notification[]>;
  updateStatus(id: string, status: string): Promise<void>;
  insertLog(log: any): Promise<void>;
  findLogsByNotificationId(notificationId: string): Promise<Log | null>;
}
