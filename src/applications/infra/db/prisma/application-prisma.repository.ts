import { PrismaService } from '../../../../shared/infra/db/prisma/prisma.service';
import { Prisma } from '@prisma/client';

import { NotFoundError } from '../../../../shared/domain/errors/not-found.error';
import { ApplicationSearchResult, IApplicationRepository, ApplicationSearchParams } from '../../../domain/application.repository';
import { Application, ApplicationId } from '../../../domain/application.aggregate';
import { ApplicationModelMapper } from './application-model-mapper';

export class ApplicationPrismaRepository implements IApplicationRepository {
  sortableFields: string[] = ['createdAt'];

  constructor(private prismaService: PrismaService) {}
  async findByName(name: string): Promise<Application | null> {
    const model = await this.prismaService.notification_applications.findFirst({
      where: { name },
    });

    return model ? ApplicationModelMapper.toEntity(model) : null;
  }

  async insert(entity: Application): Promise<void> {
    const modelProps = ApplicationModelMapper.toModel(entity);
    await this.prismaService.notification_applications.create({
      data: {
        ...modelProps,
        id: entity.id.toString(),
      },
    });
  }

  async bulkInsert(entities: Application[]): Promise<void> {
    const modelsProps = entities.map((entity) =>
      ApplicationModelMapper.toModel(entity),
    );

    await this.prismaService.notification_applications.createMany({
      data: modelsProps,
    });
  }

  async findById(entityId: ApplicationId): Promise<Application> {
    const model = await this.prismaService.notification_applications.findUnique({
      where: { id: entityId.toString() },
    });

    if (!model) {
      throw new NotFoundError(entityId, Application);
    }

    return ApplicationModelMapper.toEntity(model);
  }

  async findWithRelationsById(entityId: ApplicationId): Promise<any> {
    const model = await this.prismaService.notification_applications.findUnique({
      where: { id: entityId.toString() },
    });

    if (!model) {
      throw new NotFoundError(entityId, Application);
    }

    return model;
  }

  async findByIds(ids: ApplicationId[]): Promise<Application[]> {
    const models = await this.prismaService.notification_applications.findMany({
      where: {
        id: {
          in: ids.map((id) => id.value),
        },
      },
    });

    return models.map((model) => {
      return ApplicationModelMapper.toEntity(model);
    });
  }

  async findAll(): Promise<Application[]> {
    const models = await this.prismaService.notification_applications.findMany({});
    return models.map((model) => {
      return ApplicationModelMapper.toEntity(model);
    });
  }

  async update(entity: Application): Promise<void> {
    const id = entity.id.value;

    const modelProps = ApplicationModelMapper.toModel(entity);

    const model = await this.prismaService.notification_applications.update({
      where: { id },
      data: modelProps,
    });

    if (!model) {
      throw new NotFoundError(id, Application);
    }
  }

  async delete(entityId: ApplicationId): Promise<void> {
    await this.prismaService.notification_applications.delete({
      where: { id: entityId.toString() },
    });
  }

  async search(props: ApplicationSearchParams): Promise<ApplicationSearchResult> {
    const offset = (props.page - 1) * props.perPage;
    const limit = props.perPage;

    const orderBy: Prisma.notification_applicationsOrderByWithRelationInput =
      props.sort && this.sortableFields.includes(props.sort)
        ? { [props.sort]: props.sortDir as 'asc' | 'desc' }
        : { created_at: 'desc' };

    const [data, total] = await this.prismaService.$transaction([
      this.prismaService.notification_applications.findMany({
        orderBy,
        skip: offset,
        take: limit,
      }),
      this.prismaService.notification_applications.count(),
    ]);

    return new ApplicationSearchResult({
      data: data.map((item) => {
        return item;
      }),
      currentPage: props.page,
      perPage: props.perPage,
      total,
    });
  }

  getEntity(): new (...args: any[]) => Application {
    return Application;
  }
}
