import { notification_applications as ApplicationPrisma } from '@prisma/client';
import { ApplicationId, Application } from '../../../domain/application.aggregate';


export class ApplicationModelMapper {
  /**
   * Mapeia uma entidade de domínio `Application` para o modelo do Prisma `ApplicationPrisma`.
   * @param entity - A entidade de domínio do usuário.
   * @returns O modelo compatível com o Prisma.
   */
  static toModel(entity: Application): ApplicationPrisma {
    return {
      id: entity.id.value,
      name: entity.name,
      api_key: entity.apiKey,
      refresh_api_key: entity.refreshApiKey,
      version_status: entity.versionStatus,
      created_at: entity.createdAt,
      updated_at: entity.updatedAt,
    };
  }

  /**
   * Mapeia um modelo do Prisma `ApplicationPrisma` para a entidade de domínio `Application`.
   * @param model - O modelo do Prisma.
   * @returns A entidade de domínio do usuário.
   */
  static toEntity(model: ApplicationPrisma): Application {
    return new Application({
      id: new ApplicationId(model.id),
      name: model.name,
      apiKey: model.api_key,
      refreshApiKey: model.refresh_api_key,
      versionStatus: model.version_status,
      createdAt: new Date(model.created_at),
      updatedAt: new Date(model.updated_at),
    });
  }
}
