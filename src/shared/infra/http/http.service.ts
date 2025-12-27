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
      `HTTP Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`,
    );
  }

  private handleResponse(response: AxiosResponse): AxiosResponse {
    this.logResponse(response);
    return response;
  }

  private logResponse(response: AxiosResponse): void {
    this.logger.log(
      `HTTP Response: ${response.status} ${response.config.method?.toUpperCase()} ${response.config.baseURL}${response.config.url}`,
    );
  }

  private handleErrorResponse(error: AxiosError): Promise<AxiosError> {
    // Capturando detalhes específicos do erro para logar de forma estruturada
    if (error.response) {
      this.logger.error(
        `HTTP Error: ${error.message}`,
        `Status: ${error.response.status}, URL: ${error.config.url}`,
      );
    } else {
      // Caso o erro seja de rede ou outro tipo que não envolva resposta
      this.logger.error(`HTTP Error: ${error.message}`, error.stack);
    }
    return Promise.reject(error);
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
    data: any,
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
    data: any,
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
    data: any,
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
