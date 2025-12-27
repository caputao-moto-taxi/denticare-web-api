import { MaxLength } from "class-validator";
import { ClassValidatorFields } from "../../shared/domain/validators/class-validator-fields";
import type { Notification } from "../../shared/domain/validators/notification";


export class NotificationRules {
  @MaxLength(255, { groups: ['title'] })
  title: string;

  @MaxLength(undefined, { groups: ['body'] })
  body: string;

  constructor(entity: any) {
    Object.assign(this, entity);
  }
}

export class NotificationValidator extends ClassValidatorFields {
  validate(notification: Notification, data: any, fields?: string[]): boolean {
    const newFields = fields?.length ? fields : ['title', 'body'];
    return super.validate(notification, new NotificationRules(data), newFields);
  }
}

export class NotificationValidatorFactory {
  static create() {
    return new NotificationValidator();
  }
}