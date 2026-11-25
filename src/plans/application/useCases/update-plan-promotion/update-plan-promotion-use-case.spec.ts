import { IPlanRepository, Plan, PlanId } from '../../../domain';
import { UpdatePlanPromotionUseCase } from './update-plan-promotion-use-case';

describe('UpdatePlanPromotionUseCase', () => {
  const planId = '123e4567-e89b-42d3-a456-426614174000';
  const currencyId = '223e4567-e89b-42d3-a456-426614174000';
  const plan = new Plan({
    id: new PlanId(planId),
    name: 'Plano teste',
    price: 100,
    currencyId,
    duration: 30,
    isOnPromotion: false,
    slug: 'plano-teste',
    totalBranch: 1,
  });
  const repository = {
    findById: jest.fn(),
    updatePromotion: jest.fn(),
  } as unknown as IPlanRepository;
  const useCase = new UpdatePlanPromotionUseCase(repository);

  beforeEach(() => {
    jest.clearAllMocks();
    (repository.findById as jest.Mock).mockResolvedValue(plan);
  });

  it('rejects a promotional price that is not lower than the regular price', async () => {
    const result = await useCase.execute({
      id: planId,
      isOnPromotion: true,
      promotionalPrice: 100,
    });

    expect(result.status).toBe(400);
    expect(repository.updatePromotion).not.toHaveBeenCalled();
  });

  it('saves an active promotion and its date range', async () => {
    const start = new Date('2026-12-01T00:00:00.000Z');
    const end = new Date('2026-12-31T00:00:00.000Z');

    await useCase.execute({
      id: planId,
      isOnPromotion: true,
      promotionalPrice: 75,
      promotionalStartDate: start,
      promotionalEndDate: end,
    });

    expect(repository.updatePromotion).toHaveBeenCalledWith(
      expect.any(PlanId),
      {
        isOnPromotion: true,
        promotionalPrice: 75,
        promotionalStartAt: start,
        promotionalEndAt: end,
      },
    );
  });

  it('clears promotional values when the promotion is disabled', async () => {
    await useCase.execute({ id: planId, isOnPromotion: false });

    expect(repository.updatePromotion).toHaveBeenCalledWith(
      expect.any(PlanId),
      {
        isOnPromotion: false,
        promotionalPrice: null,
        promotionalStartAt: null,
        promotionalEndAt: null,
      },
    );
  });

  it('returns not found when the plan does not exist', async () => {
    (repository.findById as jest.Mock).mockResolvedValue(null);

    const result = await useCase.execute({
      id: planId,
      isOnPromotion: false,
    });

    expect(result.status).toBe(404);
    expect(repository.updatePromotion).not.toHaveBeenCalled();
  });
});
