import { Uuid } from '../../shared/domain/value-objects/uuid.vo';
import { AggregateRoot } from '../../shared/domain/aggregate-root';
import { ValueObject } from '../../shared/domain/value-object';
import { PlanValidatorFactory } from './Plan.validator';

export class PlanId extends Uuid { }

export type PlanContructorProps = {
  id?: PlanId;
  name: string;
  price: number;
  currencyId: string;
  duration: number;
  isOnPromotion: boolean;
  promotionalPrice?: number;
  promotionalStartAt?: Date;
  promotionalEndAt?: Date;
  slug: string;
  totalBranch: number;
  createdAt?: Date;
  updatedAt?: Date;
};

export type PlanCreateCommand = Omit<
  PlanContructorProps,
  'id' | 'createdAt' | 'updatedAt'
>;

export class Plan extends AggregateRoot {
  id?: PlanId;
  name: string;
  price: number;
  currencyId: string;
  duration: number;
  isOnPromotion: boolean;
  promotionalPrice?: number;
  promotionalStartAt?: Date;
  promotionalEndAt?: Date;
  slug: string;
  totalBranch: number;
  createdAt?: Date;
  updatedAt?: Date;

  constructor(props: PlanContructorProps) {
    super();
    Object.assign(this, {
      id: props.id ?? new PlanId(),
      name: props.name,
      price: props.price,
      currencyId: props.currencyId,
      duration: props.duration,
      isOnPromotion: props.isOnPromotion,
      promotionalPrice: props.promotionalPrice,
      promotionalStartAt: props.promotionalStartAt,
      promotionalEndAt: props.promotionalEndAt,
      slug: props.slug,
      totalBranch: props.totalBranch,
      createdAt: props.createdAt ?? new Date(),
      updatedAt: props.updatedAt ?? new Date(),
    });
  }
  get entityId(): ValueObject {
    return this.id;
  }

  static create(props: PlanCreateCommand): Plan {
    const plan = new Plan({ ...props });
    plan.validate(['name', 'price', 'duration', 'totalBranch']);
    return plan;
  }

  validate(fields?: string[]) {
    const validator = PlanValidatorFactory.create();
    return validator.validate(this.name, this.price, this.duration, this.totalBranch, fields);
  }
  toJSON() {
    return {
      id: this.id.value,
      name: this.name,
      price: this.price,
      currencyId: this.currencyId,
      duration: this.duration,
      isOnPromotion: this.isOnPromotion,
      promotionalPrice: this.promotionalPrice,
      promotionalStartAt: this.promotionalStartAt,
      promotionalEndAt: this.promotionalEndAt,
      slug: this.slug,
      totalBranch: this.totalBranch,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
