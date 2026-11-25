import { Injectable, Logger } from '@nestjs/common';
import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  AxiosError,
  InternalAxiosRequestConfig,
} from 'axios';

export interface CustomAxiosRequestConfig extends AxiosRequestConfig {
  enableLogging?: boolean;
}

@Injectable()
export class HttpService {
  private readonly logger = new Logger(HttpService.name); // Logger do NestJS
  private axiosInstance: AxiosInstance;

  constructor(private readonly options: CustomAxiosRequestConfig) {
    const { enableLogging, ...config } = options;
    this.axiosInstance = axios.create(config);

    if (enableLogging) {
      this.axiosInstance.interceptors.request.use(
        this.handleRequest.bind(this),
      );
      this.axiosInstance.interceptors.response.use(
        this.handleResponse.bind(this),
        (error) => this.handleErrorResponse(error),
      );
    }
  }

  private handleRequest(
    config: InternalAxiosRequestConfig,
  ): InternalAxiosRequestConfig {
    this.logRequest(config);
    return config;
  }

  private logRequest(config: InternalAxiosRequestConfig): void {
    this.logger.log(
      `HTTP Request: ${config.method?.toUpperCase()} ${this.safeTarget(config.url, config.baseURL)}`,
    );
  }

  private handleResponse(response: AxiosResponse): AxiosResponse {
    this.logResponse(response);
    return response;
  }

  private logResponse(response: AxiosResponse): void {
    this.logger.log(
      `HTTP Response: ${response.status} ${response.config.method?.toUpperCase()} ${this.safeTarget(response.config.url, response.config.baseURL)}`,
    );
  }

  private handleErrorResponse(error: AxiosError): Promise<AxiosError> {
    if (error.response) {
      this.logger.error(
        `HTTP Error: status ${error.response.status} for ${error.config?.method?.toUpperCase()} ${this.safeTarget(error.config?.url, error.config?.baseURL)}`,
      );
    } else {
      this.logger.error(
        `HTTP network error for ${error.config?.method?.toUpperCase()} ${this.safeTarget(error.config?.url, error.config?.baseURL)}`,
      );
    }
    return Promise.reject(error);
  }

  private safeTarget(url?: string, baseURL?: string): string {
    try {
      const target = new URL(url ?? '', baseURL);
      return `${target.origin}${target.pathname}`;
    } catch {
      return (url ?? '').split('?')[0].slice(0, 256);
    }
  }

  async get<T>(
    url: string,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> {
    const response: AxiosResponse<T> = await this.axiosInstance.get(
      url,
      config,
    );
    return response;
  }

  async post<T>(
    url: string,
    data: unknown,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> {
    const response: AxiosResponse<T> = await this.axiosInstance.post(
      url,
      data,
      config,
    );
    return response;
  }

  async put<T>(
    url: string,
    data: unknown,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> {
    const response: AxiosResponse<T> = await this.axiosInstance.put(
      url,
      data,
      config,
    );
    return response;
  }

  async patch<T>(
    url: string,
    data: unknown,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> {
    const response: AxiosResponse<T> = await this.axiosInstance.patch(
      url,
      data,
      config,
    );
    return response;
  }

  async delete<T>(
    url: string,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> {
    const response: AxiosResponse<T> = await this.axiosInstance.delete(
      url,
      config,
    );
    return response;
  }
}
