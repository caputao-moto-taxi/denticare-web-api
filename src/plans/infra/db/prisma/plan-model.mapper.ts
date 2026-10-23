import { Plan as PlanPrisma } from '../../../../../generated/prisma/client';
import { Plan, PlanId } from '../../../domain/plan.aggregate';

export class PlanModelMapper {
  static toModel(plan: Plan): PlanPrisma {
    return {
      id: plan.id.value,
      name: plan.name,
      price: Number(plan.price),
      subscriptionPrice: null,
      subscriptionMonths: null,
      isSubscriptionOption: false,
      currencyId: plan.currencyId,
      duration: plan.duration,
      isOnPromotion: plan.isOnPromotion,
      promotionalPrice: plan.promotionalPrice
        ? Number(plan.promotionalPrice)
        : null,
      slug: plan.slug,
      promotionEndDate: plan.promotionalEndAt,
      promotionStartDate: plan.promotionalStartAt,
      promotionPercentage: null,
      deletedAt: null,
      total_branch: plan.totalBranch,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    };
  }

  static toEntity(model: PlanPrisma): Plan {
    return new Plan({
      id: new PlanId(model.id),
      name: model.name,
      price: model.price,
      currencyId: model.currencyId,
      duration: model.duration,
      isOnPromotion: model.isOnPromotion,
      promotionalPrice: model.promotionalPrice ?? undefined,
      promotionalStartAt: model.promotionStartDate ?? undefined,
      promotionalEndAt: model.promotionEndDate ?? undefined,
      slug: model.slug,
      totalBranch: model.total_branch,
      createdAt: new Date(model.createdAt),
      updatedAt: new Date(model.updatedAt),
    });
  }
}
