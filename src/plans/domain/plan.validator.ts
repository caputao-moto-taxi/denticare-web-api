import { Max, MaxLength } from 'class-validator';
import { ClassValidatorFields } from '../../shared/domain/validators/class-validator-fields';
import { Notification } from '../../shared/domain/validators/notification';

export class PlanRules {
  @MaxLength(255, { groups: ['name'] })
  name: string;

  @MaxLength(undefined, { groups: ['price'] })
  price: number;

  @Max(undefined, { groups: ['totalBranch'] })
  totalBranch: number;

  constructor(entity: any) {
    Object.assign(this, entity);
  }
}

export class PlanValidator extends ClassValidatorFields {
  validate(plan: Notification, data: any, fields?: string[]): boolean {
    const newFields = fields?.length ? fields : ['name', 'price', 'totalBranch'];
    return super.validate(plan, new PlanRules(data), newFields);
  }
}

export class PlanValidatorFactory {
  static create() {
    return new PlanValidator();
  }
}
