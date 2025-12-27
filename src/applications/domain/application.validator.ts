import { MaxLength } from 'class-validator';
import { ClassValidatorFields } from '../../shared/domain/validators/class-validator-fields';
import { Notification } from '../../shared/domain/validators/notification';
import { notification_applications as Application } from '@prisma/client';

export class ApplicationRules {
  @MaxLength(255, { groups: ['name'] })
  name: string;

  constructor(entity: Application) {
    Object.assign(this, entity);
  }
}

export class ApplicationValidator extends ClassValidatorFields {
  validate(notification: Notification, data: any, fields?: string[]): boolean {
    const newFields = fields?.length ? fields : ['name'];
    return super.validate(notification, new ApplicationRules(data), newFields);
  }
}

export class ApplicationValidatorFactory {
  static create() {
    return new ApplicationValidator();
  }
}
