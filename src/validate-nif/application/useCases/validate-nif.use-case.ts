import axios from 'axios';
import { HttpStatus } from '@nestjs/common';
import {
  HttpResponseType,
  badRequestResponse,
  successResponse,
} from '../../../shared/contracts/httpContracts';
import type { UseCase } from '../../../shared/contracts/useCasesOrServicesContract';
import type { ValidateNifInterface } from '../interface/validateNif.interface';

const NIF_PROVIDER_URL = 'https://dominios.ao/ao/actions/nif.ajcall.php';

export class ValidateNifUseCase implements UseCase {
  async execute({ nif }: ValidateNifInterface) {
    if (!/^\d{10}$/.test(nif ?? '')) {
      return badRequestResponse({ message: 'NIF must be 10 digits' });
    }

    try {
      const { data: result } = await axios.get(NIF_PROVIDER_URL, {
        params: { nif },
      });
      if (result.success !== true && result.sucess !== true) {
        return badRequestResponse({ message: 'NIF is not valid' });
      }

      const record = Array.isArray(result.data) ? result.data[0] : result.data;
      const nameKey = Object.keys(record ?? {}).find((key) =>
        /nome|name|razao|designacao|titular/i.test(key),
      );
      const name = nameKey ? String(record[nameKey]).trim() : '';
      if (!name) {
        return badRequestResponse({ message: 'NIF is not valid' });
      }

      return successResponse({ nif, name });
    } catch {
      return new HttpResponseType({
        status: HttpStatus.BAD_GATEWAY,
        data: { message: 'NIF verification service is unavailable' },
      });
    }
  }
}
