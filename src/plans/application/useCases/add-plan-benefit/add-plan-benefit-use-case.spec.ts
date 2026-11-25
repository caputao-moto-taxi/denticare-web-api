import { IPlanRepository, Plan, PlanId } from '../../../domain';
import { AddPlanBenefitUseCase } from './add-plan-benefit-use-case';

describe('AddPlanBenefitUseCase', () => {
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
    addBenefit: jest.fn(),
  } as unknown as IPlanRepository;
  const useCase = new AddPlanBenefitUseCase(repository);

  beforeEach(() => {
    jest.clearAllMocks();
    (repository.findById as jest.Mock).mockResolvedValue(plan);
    (repository.addBenefit as jest.Mock).mockResolvedValue({
      id: '323e4567-e89b-42d3-a456-426614174000',
      benefit: {
        id: '423e4567-e89b-42d3-a456-426614174000',
        name: 'Relatórios avançados',
        details: null,
      },
    });
  });

  it('creates and associates a trimmed benefit with the plan', async () => {
    const result = await useCase.execute({
      planId,
      name: '  Relatórios avançados  ',
      details: '  ',
    });

    expect(result.status).toBe(200);
    expect(repository.addBenefit).toHaveBeenCalledWith(expect.any(PlanId), {
      name: 'Relatórios avançados',
      details: null,
    });
  });

  it('returns not found when the target plan does not exist', async () => {
    (repository.findById as jest.Mock).mockResolvedValue(null);

    const result = await useCase.execute({ planId, name: 'Benefício' });

    expect(result.status).toBe(404);
    expect(repository.addBenefit).not.toHaveBeenCalled();
  });
});
