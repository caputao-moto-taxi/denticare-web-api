import { DynamicModule, Module, Provider } from '@nestjs/common';
import { HttpService, CustomAxiosRequestConfig } from './http.service';

@Module({})
export class HttpModule {
  private static getDynamicHttpModule(option: {
    serviceName: string;
    config: CustomAxiosRequestConfig;
  }) {
    const httpService = new HttpService(option.config);
    const providerName = option.serviceName;
    return {
      module: HttpModule,
      providers: [
        {
          provide: providerName,
          useValue: httpService,
        },
      ],
      exports: [providerName],
    };
  }

  static forFeature(
    options:
      | { serviceName: string; config: CustomAxiosRequestConfig }
      | { serviceName: string; config: CustomAxiosRequestConfig }[],
  ): DynamicModule {
    if (Array.isArray(options)) {
      return options.reduce(
        (acc, option) => {
          const httpService = new HttpService(option.config);
          const providerName = option.serviceName;
          acc.providers.push({
            provide: providerName,
            useValue: httpService,
          });
          acc.exports.push(providerName);
          return acc;
        },
        {
          module: HttpModule,
          providers: [],
          exports: [],
        },
      );
    } else {
      return HttpModule.getDynamicHttpModule(options);
    }
  }

  static forRoot(config: CustomAxiosRequestConfig): DynamicModule {
    const httpService = new HttpService(config);

    return {
      module: HttpModule,
      providers: [
        {
          provide: HttpService,
          useValue: httpService,
        },
      ],
      exports: [HttpService],
    };
  }

  static forFeatureWithProvider(options: {
    serviceName: string;
    config: CustomAxiosRequestConfig;
  }): {
    module: DynamicModule;
    provider: Provider;
  } {
    const httpService = new HttpService(options.config);
    const providerName = options.serviceName;
    const provider = {
      provide: providerName,
      useValue: httpService,
    } as Provider;
    return {
      module: {
        module: HttpModule,
        providers: [provider],
        exports: [providerName, HttpModule],
      },
      provider,
    };
  }
}
