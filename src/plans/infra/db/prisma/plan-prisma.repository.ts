import {
  IPlanRepository,
  Plan,
  PlanSearchResult,
  PlanId,
  PlanSearchParams,
} from '../../../domain';
import { PlanModelMapper } from './plan-model.mapper';
import { NotFoundError } from '../../../../shared/domain/errors/not-found.error';
import { PrismaService } from '../../../../shared/infra/db/prisma/prisma.service';

export class PlanPrismaRepository implements IPlanRepository {
  sortableFields: string[] = ['createdAt'];

  constructor(private _prismaService: PrismaService) { }
  async insert(entity: Plan): Promise<void> {
    const modelProps = PlanModelMapper.toModel(entity);
    await this._prismaService.plan.create({
      data: {
        ...modelProps,
      },
    });
  }
  async bulkInsert(entities: Plan[]): Promise<void> {
    const modelProps = entities.map((entity) => {
      return PlanModelMapper.toModel(entity);
    });

    await this._prismaService.plan.createMany({
      data: modelProps,
    });
  }
  async findById(entityId: PlanId): Promise<Plan> {
    const plan = await this._prismaService.plan.findUnique({
      where: { id: entityId.value },
    });
    if (!plan) {
      throw new NotFoundError(entityId, Plan);
    }

    return PlanModelMapper.toEntity(plan);
  }
  async findByIds(ids: PlanId[]): Promise<Plan[]> {
    const plans = await this._prismaService.plan.findMany({
      where: {
        id: { in: ids.map((id) => id.value) },
      },
    });
    return plans.map((plan) => {
      return PlanModelMapper.toEntity(plan);
    });
  }
  async findAll(): Promise<any[]> {
    return await this._prismaService.plan.findMany({
      include: {
        PlanBenefit: {
          include: {
            benefit: {
              select: {
                details: true,
              },
            },
          },
        },
        currency: true,
      },
    });
  }
  async update(entity: Plan): Promise<void> {
    const modelProps = PlanModelMapper.toModel(entity);
    const planToUpdate = await this._prismaService.plan.update({
      where: { id: entity.id.value },
      data: modelProps,
    });
    if (!planToUpdate) {
      throw new NotFoundError(entity.id, Plan);
    }
  }
  async delete(entityId: PlanId): Promise<void> {
    await this._prismaService.plan.delete({
      where: { id: entityId.value },
    });
  }
  getEntity(): new (...args: any[]) => Plan {
    return Plan;
  }

  async search(props: PlanSearchParams): Promise<PlanSearchResult> {
    const offset = (props.page - 1) * props.perPage;
    const limit = props.perPage;

    const validSortFields = [
      'id',
      'name',
      'price',
      'duration',
      'is_on_promotion',
      'promotional_price',
      'promotional_end_date',
      'promotional_start_date',
      'slug',
      'total_branch',
      'created_at',
      'updated_at',
    ];

    const shouldOrder =
      props.sort && validSortFields.includes(props.sort) && props.sortDir;

    const [data, total] = await this._prismaService.$transaction([
      this._prismaService.plan.findMany({
        ...(shouldOrder && {
          orderBy: {
            [props.sort]: props.sortDir as 'asc' | 'desc',
          },
        }),
        skip: offset,
        take: limit,
      }),
      this._prismaService.plan.count(),
    ]);

    return new PlanSearchResult({
      data,
      currentPage: props.page,
      perPage: props.perPage,
      total,
    });
  }
}
