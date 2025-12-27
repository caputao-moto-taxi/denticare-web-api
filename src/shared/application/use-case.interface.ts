import type { HttpResponse } from "../contracts/httpContracts";

export interface IUseCase<Input, Output> {
  execute(input: Input): Promise<HttpResponse<Output>>;
}
