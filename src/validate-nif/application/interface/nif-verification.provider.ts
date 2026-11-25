export type NifProviderResult = {
  success?: boolean;
  sucess?: boolean;
  data?: unknown;
};

export abstract class INifVerificationProvider {
  abstract verify(nif: string): Promise<NifProviderResult>;
}
