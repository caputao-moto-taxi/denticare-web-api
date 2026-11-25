import { IPlanRepository } from '../../../domain';
import { CreatePlanUseCase } from './create-plan-use-case';

describe('CreatePlanUseCase', () => {
  const repository = {
    insert: jest.fn(),
  } as unknown as IPlanRepository;
  const useCase = new CreatePlanUseCase(repository);
  const baseInput = {
    name: 'Essencial',
    price: 100,
    currencyId: '123e4567-e89b-42d3-a456-426614174000',
    duration: 30,
    isOnPromotion: false,
    totalBranch: 1,
  };

  beforeEach(() => jest.clearAllMocks());

  it('creates a plan without requiring promotion details', async () => {
    const result = await useCase.execute(baseInput);

    expect(result.status).toBe(200);
    expect(repository.insert).toHaveBeenCalledTimes(1);
  });

  it('rejects a promotional price that is not lower than the plan price', async () => {
    const result = await useCase.execute({
      ...baseInput,
      isOnPromotion: true,
      promotionalPrice: 100,
    });

    expect(result.status).toBe(400);
    expect(repository.insert).not.toHaveBeenCalled();
  });
});
