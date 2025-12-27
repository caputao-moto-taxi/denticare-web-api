import {
  DocumentBuilder,
  OpenAPIObject,
  SwaggerCustomOptions,
  SwaggerDocumentOptions,
} from '@nestjs/swagger';
import {
  appDocCustomCss,
  appDocDescription,
  appDocTitle,
  appFavicon,
  appVersion,
} from './basicConfigsConstants';
import type { PathsObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';

const arrayIntersect = (array1: string[], array2: string[]): string[] =>
  array1.filter((item) => array2.includes(item));

export const openApiDocumentBuilder = () =>
  new DocumentBuilder()
    .setTitle(appDocTitle)
    .setDescription(appDocDescription)
    .setVersion(appVersion);

export const openApiOperationsSorter = function (a, b) {
  const order = {
    get: '0',
    post: '1',
    put: '2',
    patch: '3',
    delete: '4',
  };
  return order[a.get('method')].localeCompare(order[b.get('method')]);
};
export const openApiFilterDocumentsPathsByTags = (
  publicDocument: OpenAPIObject,
): PathsObject => {
  const result: PathsObject = {};

  const tags = publicDocument.tags?.map(({ name }) => name) as string[];

  for (const path of Object.keys(publicDocument.paths)) {
    const pathMethods = {};

    for (const method of Object.keys(publicDocument.paths[path])) {
      const endpointTags = publicDocument.paths[path][method].tags;

      if (!Array.isArray(endpointTags)) {
        continue;
      }

      if (arrayIntersect(tags, endpointTags).length > 0) {
        pathMethods[method] = publicDocument.paths[path][method];
      }
    }

    result[path] = pathMethods;
  }

  return result;
};


export const openApiOptionsBase: SwaggerCustomOptions = {
  customSiteTitle: appDocTitle,
  customfavIcon: appFavicon,
  customCss: appDocCustomCss,
  swaggerOptions: {
    apisSorter: 'alpha',
    tagsSorter: 'alpha',
    operationsSorter: openApiOperationsSorter,
  },
};

export const openApiDocumentOptionsBase: SwaggerDocumentOptions = {
  operationIdFactory: (_controllerKey: string, methodKey: string) => methodKey,
};
