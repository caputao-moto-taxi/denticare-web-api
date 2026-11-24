import { IPlanRepository, PlanId } from '../../../domain';
import { GetPlanUseCase } from './get-plan-use-case';

describe('GetPlanUseCase', () => {
  const repository = {
    findById: jest.fn(),
  } as unknown as IPlanRepository;
  const useCase = new GetPlanUseCase(repository);

  beforeEach(() => jest.clearAllMocks());

  it('converts an absent query result into the existing not-found response', async () => {
    (repository.findById as jest.Mock).mockResolvedValue(null);
    const id = '123e4567-e89b-12d3-a456-426614174000';

    await expect(useCase.execute({ id })).resolves.toMatchObject({
      status: 500,
      data: { message: `Plan Not Found using ID ${id}` },
    });
    expect(repository.findById).toHaveBeenCalledWith(expect.any(PlanId));
  });
});
