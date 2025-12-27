import { Application } from '../../../domain';

export type CreateApplicationOutput = {
  id: string;
  name: string;
  apiKey: string;
  versionStatus: string;
  refreshApiKey?: string;
  createdAt: Date;
  updatedAt: Date;
};

export class ApplicationOutputMapper {
  static toOutput(entity: Application): CreateApplicationOutput {
    return entity.toJSON();
  }
}
