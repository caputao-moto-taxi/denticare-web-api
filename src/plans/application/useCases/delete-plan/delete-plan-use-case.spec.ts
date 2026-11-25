import { IPlanRepository, Plan, PlanId } from '../../../domain';
import { DeletePlanUseCase } from './delete-plan-use-case';

describe('DeletePlanUseCase', () => {
  const planId = '123e4567-e89b-42d3-a456-426614174000';
  const plan = new Plan({
    id: new PlanId(planId),
    name: 'Plano teste',
    price: 100,
    currencyId: '223e4567-e89b-42d3-a456-426614174000',
    duration: 30,
    isOnPromotion: false,
    slug: 'plano-teste',
    totalBranch: 1,
  });
  const repository = {
    findById: jest.fn(),
    delete: jest.fn(),
  } as unknown as IPlanRepository;
  const useCase = new DeletePlanUseCase(repository);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('soft-deletes the requested plan', async () => {
    (repository.findById as jest.Mock).mockResolvedValue(plan);

    await expect(useCase.execute({ id: planId })).resolves.toMatchObject({
      status: 200,
      data: { id: planId },
    });
    expect(repository.delete).toHaveBeenCalledWith(expect.any(PlanId));
  });

  it('returns not found without deleting when the plan is absent', async () => {
    (repository.findById as jest.Mock).mockResolvedValue(null);

    const result = await useCase.execute({ id: planId });

    expect(result.status).toBe(404);
    expect(repository.delete).not.toHaveBeenCalled();
  });
});
