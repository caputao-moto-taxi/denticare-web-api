import { Injectable } from '@nestjs/common';
import axios from 'axios';
import {
  INifVerificationProvider,
  NifProviderResult,
} from '../../application/interface/nif-verification.provider';

const NIF_PROVIDER_URL = 'https://dominios.ao/ao/actions/nif.ajcall.php';

@Injectable()
export class DominiosAoNifProvider implements INifVerificationProvider {
  async verify(nif: string): Promise<NifProviderResult> {
    const { data } = await axios.get<NifProviderResult>(NIF_PROVIDER_URL, {
      params: { nif },
    });
    return data;
  }
}
