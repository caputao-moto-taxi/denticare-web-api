import { AggregateRoot } from "../../shared/domain/aggregate-root";
import { ValueObject } from "../../shared/domain/value-object";
import { Uuid } from "../../shared/domain/value-objects/uuid.vo";

export type LogsContructorProps = {
  id: LogsId;
  error: string;
  message: string;
  timestamp: Date;
  type: string;
  statusCode: number;
  retryCount: number;
  notificationId: string;
  createdAt?: Date;
  updatedAt?: Date;
}


export type LogsCreateCommand = Omit<
LogsContructorProps,
  'id' | 'createdAt' | 'updatedAt'
>;

export class LogsId extends Uuid {}

export class Logs extends AggregateRoot {
  id: LogsId;
  error: string;
  message: string;
  type: string;
  statusCode: number;
  timestamp: Date;
  retryCount: number;
  notificationId: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(props: LogsContructorProps) {
    super();
    Object.assign(this, {
      ...props,
      id: props.id || new LogsId(),
      createdAt: props.createdAt ?? new Date(),
      updatedAt: props.updatedAt ?? new Date(),
    });
  }

  get entityId(): ValueObject {
    return this.id;
  }

  static create(props: LogsCreateCommand): Logs {
    const log = new Logs({
      ...props,
      id: new LogsId(),
    });
    return log;
  }
  toJSON() {
    return {
      id: this.id.value,
      error: this.error,
      message: this.message,
      type: this.type,
      statusCode: this.statusCode,
      timestamp: this.timestamp,
      retryCount: this.retryCount,
      notificationId: this.notificationId,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}


