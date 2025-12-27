import { ApplicationVersionStatus } from '@prisma/client';
import { AggregateRoot } from '../../shared/domain/aggregate-root';
import { ValueObject } from '../../shared/domain/value-object';
import { Uuid } from '../../shared/domain/value-objects/uuid.vo';
import { ApplicationValidatorFactory } from './application.validator';

export type ApplicationConstructorProps = {
  id?: ApplicationId;
  name: string;
  apiKey?: string;
  versionStatus?: string;
  refreshApiKey?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export type ApplicationCreateCommand = Omit<
  ApplicationConstructorProps,
  'id' | 'createdAt' | 'updatedAt'
>;

export class ApplicationId extends Uuid {}

export class Application extends AggregateRoot {
  id: ApplicationId;
  name: string;
  apiKey?: string;
  versionStatus?: ApplicationVersionStatus;
  refreshApiKey?: string;
  createdAt?: Date;
  updatedAt?: Date;

  constructor(props: ApplicationConstructorProps) {
    super();
    Object.assign(this, {
      id: props.id ?? new ApplicationId(),
      name: props.name,
      apiKey: props.apiKey,
      versionStatus: props.versionStatus,
      refreshApiKey: props.refreshApiKey ?? null,
      createdAt: props.createdAt ?? new Date(),
      updatedAt: props.updatedAt ?? new Date(),
    });
  }

  get entityId(): ValueObject {
    return this.id;
  }

  static create(props: ApplicationCreateCommand): Application {
    const application = new Application({ ...props });
    application.validate(['name', 'description']);
    return application;
  }

  validate(fields?: string[]) {
    const validator = ApplicationValidatorFactory.create();
    return validator.validate(this.notification, this, fields);
  }

  toJSON() {
    return {
      id: this.id.value,
      name: this.name,
      versionStatus: this.versionStatus,
      apiKey: this.apiKey,
      refreshApiKey: this.refreshApiKey,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
