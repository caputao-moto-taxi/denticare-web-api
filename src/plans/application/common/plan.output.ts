import { Plan } from '../../domain';

export type CreatePlanOutput = {
  id: string;
  name: string;
  price: number;
  currencyId: string;
  duration: number;
  isOnPromotion: boolean;
  promotionalPrice?: number;
  promotionalStartDate?: Date;
  promotionalEndDate?: Date;
  totalBranch: number;
  benefitIds?: string[];
  createdAt?: Date;
  updatedAt?: Date;
};

export class PlanOutputMapper {
  static toOutput(entity: Plan): CreatePlanOutput {
    const json = entity.toJSON();
    return {
      ...json,
      id: json.id.toString(),
    };
  }
}
