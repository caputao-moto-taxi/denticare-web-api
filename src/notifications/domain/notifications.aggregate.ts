import { Uuid } from "../../shared/domain/value-objects/uuid.vo"
import { AggregateRoot } from "../../shared/domain/aggregate-root";
import { ValueObject } from "../../shared/domain/value-object";
import { NotificationValidatorFactory } from "./notification.validator";


export class NotificationId extends Uuid {}

export type NotificationContructorProps = {
  id?: NotificationId;
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
}

export type NotificationCreateCommand = Omit<
  NotificationContructorProps,
  'id' | 'createdAt' | 'updatedAt'
>;

export class Notification extends AggregateRoot {
  id: NotificationId;
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

  constructor(props: NotificationContructorProps) {
    super();
    Object.assign(this, {
      id: props.id ?? new NotificationId(),
      type: props.type,
      receipts: props.receipts,
      title: props.title,
      body: props.body,
      scheduledAt: props.scheduledAt ?? new Date(),
      sentAt: props.sentAt,
      applicationId: props.applicationId,
      reScheduledAt: props.reScheduledAt,
      status: props.status,
      createdAt: props.createdAt ?? new Date(),
      updatedAt: props.updatedAt ?? new Date(),
    })
  }
  get entityId(): ValueObject {
    return this.id;
  }

  static create(props: NotificationCreateCommand): Notification {
    const notification = new Notification({ ...props });
    notification.validate(['type', 'receipts', 'title', 'body']);
    return notification;
  }

  validate(fields?: string[]) {
    const validator = NotificationValidatorFactory.create();
    return validator.validate(this.notification, this, fields);
  }
  toJSON() {
    return {
      id: this.id.value,
      type: this.type,
      receipts: this.receipts,
      title: this.title,
      body: this.body,
      scheduledAt: this.scheduledAt,
      sentAt: this.sentAt,
      applicationId: this.applicationId,
      reScheduledAt: this.reScheduledAt,
      status: this.status,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    }
  }
}