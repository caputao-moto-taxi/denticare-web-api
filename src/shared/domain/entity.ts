import { ValueObject } from './value-object';
import { Notification } from './validators/notification';
export abstract class Entity {
  notification: Notification = new Notification();

  abstract get entityId(): ValueObject;
  abstract toJSON(): any;
}
