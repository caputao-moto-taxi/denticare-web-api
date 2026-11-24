import { BadRequestException } from '@nestjs/common';
import { IPlanRepository } from '../../../domain';
import { ListPlansUseCase } from './list-plans-use-case';

describe('ListPlansUseCase', () => {
  const repository = {
    listPaginated: jest.fn(),
  } as unknown as IPlanRepository;
  const useCase = new ListPlansUseCase(repository);

  beforeEach(() => jest.clearAllMocks());

  it('rejects unsupported filters before querying the repository', async () => {
    await expect(useCase.execute({ category: 'unsupported' })).rejects.toThrow(
      BadRequestException,
    );
    expect(repository.listPaginated).not.toHaveBeenCalled();
  });

  it('delegates validated pagination queries', async () => {
    const result = { data: [], total: 0 };
    (repository.listPaginated as jest.Mock).mockResolvedValue(result);

    await expect(
      useCase.execute({ page: 1, pageSize: 10 }),
    ).resolves.toMatchObject({
      data: result,
    });
    expect(repository.listPaginated).toHaveBeenCalledWith({
      page: 1,
      pageSize: 10,
    });
  });
});
