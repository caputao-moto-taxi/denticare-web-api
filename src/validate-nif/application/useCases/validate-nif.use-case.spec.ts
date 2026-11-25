import { ValidateNifUseCase } from './validate-nif.use-case';

describe('ValidateNifUseCase', () => {
  const provider = { verify: jest.fn() };
  const useCase = new ValidateNifUseCase(provider);

  beforeEach(() => jest.clearAllMocks());

  it('validates a 10-digit NIF and returns the registered name', async () => {
    provider.verify.mockResolvedValue({
      success: true,
      data: [{ nome: 'Clinica DentCare' }],
    });

    await expect(useCase.execute({ nif: '1234567890' })).resolves.toMatchObject(
      {
        status: 200,
        data: { nif: '1234567890', name: 'Clinica DentCare' },
      },
    );
  });

  it('rejects a NIF rejected by the provider even when the request succeeds', async () => {
    provider.verify.mockResolvedValue({ success: false, data: [] });

    await expect(useCase.execute({ nif: '1234567890' })).resolves.toMatchObject(
      {
        status: 400,
        data: { message: 'NIF is not valid' },
      },
    );
  });

  it('rejects NIFs that do not contain exactly 10 digits without calling the provider', async () => {
    await expect(useCase.execute({ nif: '123456789' })).resolves.toMatchObject({
      status: 400,
    });
    expect(provider.verify).not.toHaveBeenCalled();
  });

  it('returns a gateway error when the provider is unavailable', async () => {
    provider.verify.mockRejectedValue(new Error('Network failure'));

    await expect(useCase.execute({ nif: '1234567890' })).resolves.toMatchObject(
      {
        status: 502,
      },
    );
  });
});
