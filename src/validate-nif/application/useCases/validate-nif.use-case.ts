import axios from 'axios';
import { HttpStatus } from '@nestjs/common';
import {
  HttpResponseType,
  badRequestResponse,
  successResponse,
} from '../../../shared/contracts/httpContracts';
import type { UseCase } from '../../../shared/contracts/useCasesOrServicesContract';
import type { ValidateNifInterface } from '../interface/validateNif.interface';

type NifProviderResponse = {
  success?: boolean;
  data?: unknown;
};

export type ValidateNifResult = {
  nif: string;
  name: string;
};

export class ValidateNifUseCase implements UseCase {
  async execute(request: ValidateNifInterface) {
    const nif = request.nif?.trim();
    if (!nif) {
      return badRequestResponse({ message: 'NIF is required' });
    }
    if (!/^\d{10}$/.test(nif)) {
      return badRequestResponse({ message: 'NIF must be 10 digits' });
    }

    try {
      const response = await this.validateNif(nif);
      if (response.data.success !== true) {
        return badRequestResponse({ message: 'NIF is not valid' });
      }
      const name = this.extractName(response.data.data);
      if (!name) {
        return new HttpResponseType({
          status: HttpStatus.BAD_GATEWAY,
          data: { message: 'The NIF provider returned no registered name' },
        });
      }
      return successResponse({ nif, name } satisfies ValidateNifResult);
    } catch {
      return new HttpResponseType({
        status: HttpStatus.BAD_GATEWAY,
        data: { message: 'NIF verification service is unavailable' },
      });
    }
  }

  private async validateNif(nif: string) {
    return axios.get<NifProviderResponse>(
      'https://dominios.ao/ao/actions/nif.ajcall.php',
      { params: { nif }, timeout: 10000 },
    );
  }

  private extractName(data: unknown) {
    const record = Array.isArray(data) ? data[0] : data;
    if (!record || typeof record !== 'object') return null;

    for (const [key, value] of Object.entries(record)) {
      const normalizedKey = key
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z]/g, '');
      const isNameField =
        normalizedKey === 'name' ||
        normalizedKey === 'razaosocial' ||
        normalizedKey === 'designacao' ||
        normalizedKey === 'titular' ||
        normalizedKey.startsWith('nome');
      if (isNameField && typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }

    return null;
  }
}
