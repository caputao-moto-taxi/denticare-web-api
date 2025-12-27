import type { HttpResponse } from './httpContracts';

export interface UseCase<T = any, R = any> {
  execute(request: T): Promise<HttpResponse<R>>;
}

export interface UseCase_<T = any, P = any, R = any> {
  execute(request: T, params: P): Promise<HttpResponse<R>>;
}

export interface UseCaseFild<F = any, V = any, R = any> {
  execute: (fild: F, value: V) => Promise<HttpResponse<R>>;
}
