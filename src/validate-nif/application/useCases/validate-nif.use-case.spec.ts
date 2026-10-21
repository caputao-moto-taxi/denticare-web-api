import axios from 'axios';
import { ValidateNifUseCase } from './validate-nif.use-case';

describe('ValidateNifUseCase', () => {
  const useCase = new ValidateNifUseCase();

  afterEach(() => jest.restoreAllMocks());

  it('validates a 10-digit NIF and returns the registered name', async () => {
    jest.spyOn(axios, 'get').mockResolvedValue({
      data: { success: true, data: [{ nome: 'Clinica DentCare' }] },
    });

    await expect(
      useCase.execute({ nif: ' 1234567890 ' }),
    ).resolves.toMatchObject({
      status: 200,
      data: { nif: '1234567890', name: 'Clinica DentCare' },
    });
  });

  it('rejects a NIF rejected by the provider even when the request succeeds', async () => {
    jest.spyOn(axios, 'get').mockResolvedValue({
      data: { success: false, data: [] },
    });

    await expect(useCase.execute({ nif: '1234567890' })).resolves.toMatchObject(
      {
        status: 400,
        data: { message: 'NIF is not valid' },
      },
    );
  });

  it('rejects NIFs that do not contain exactly 10 digits without calling the provider', async () => {
    const providerRequest = jest.spyOn(axios, 'get');

    await expect(useCase.execute({ nif: '123456789' })).resolves.toMatchObject({
      status: 400,
    });
    expect(providerRequest).not.toHaveBeenCalled();
  });

  it('returns a gateway error when the provider is unavailable', async () => {
    jest.spyOn(axios, 'get').mockRejectedValue(new Error('Network failure'));

    await expect(useCase.execute({ nif: '1234567890' })).resolves.toMatchObject(
      {
        status: 502,
      },
    );
  });
});
