import type { HttpResponse } from './httpContracts';

export interface UseCase<T = unknown, R = unknown> {
  execute(request: T): Promise<HttpResponse<R>>;
}

export interface UseCase_<T = unknown, P = unknown, R = unknown> {
  execute(request: T, params: P): Promise<HttpResponse<R>>;
}

export interface UseCaseFild<F = unknown, V = unknown, R = unknown> {
  execute: (fild: F, value: V) => Promise<HttpResponse<R>>;
}
