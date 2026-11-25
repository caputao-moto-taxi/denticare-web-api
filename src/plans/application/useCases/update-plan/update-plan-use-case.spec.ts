import { IPlanRepository, Plan, PlanId } from '../../../domain';
import { UpdatePlanUseCase } from './update-plan-use-case';

describe('UpdatePlanUseCase', () => {
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
    updateDetails: jest.fn(),
  } as unknown as IPlanRepository;
  const useCase = new UpdatePlanUseCase(repository);

  beforeEach(() => {
    jest.clearAllMocks();
    (repository.findById as jest.Mock).mockResolvedValue(plan);
  });

  it('updates and normalizes plan details', async () => {
    const result = await useCase.execute({
      id: planId,
      name: '  Plano avançado  ',
      price: 150,
      currencyId,
      duration: 60,
      totalBranch: 3,
    });

    expect(result.status).toBe(200);
    expect(repository.updateDetails).toHaveBeenCalledWith(expect.any(PlanId), {
      name: 'Plano avançado',
      price: 150,
      currencyId,
      duration: 60,
      totalBranch: 3,
    });
  });

  it('preserves an active promotion when the regular price is reduced', async () => {
    const promotedPlan = new Plan({
      ...plan,
      isOnPromotion: true,
      promotionalPrice: 75,
    });
    (repository.findById as jest.Mock).mockResolvedValue(promotedPlan);

    const result = await useCase.execute({
      id: planId,
      name: 'Plano teste',
      price: 70,
      currencyId,
      duration: 30,
      totalBranch: 1,
    });

    expect(result.status).toBe(400);
    expect(repository.updateDetails).not.toHaveBeenCalled();
  });
});
