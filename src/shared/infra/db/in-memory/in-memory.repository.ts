/* eslint-disable @typescript-eslint/no-unused-expressions */
import { Entity } from '../../../domain/entity';
import { NotFoundError } from '../../../domain/errors/not-found.error';
import {
  IRepository,
  ISearchableRepository,
} from '../../../domain/repository/repository-interface';
import {
  SearchParams,
  SortDirection,
} from '../../../domain/repository/search-params';
import { SearchResult } from '../../../domain/repository/search-result';
import { ValueObject } from '../../../domain/value-object';

export abstract class InMemoryRepository<
  E extends Entity,
  EntityId extends ValueObject,
> implements IRepository<E, EntityId>
{
  data: E[] = [];

  async insert(entity: E): Promise<void> {
    this.data.push(entity);
  }
  async bulkInsert(entities: any[]): Promise<void> {
    this.data.push(...entities);
  }

  async update(entity: E): Promise<void> {
    const indexFound = this.data.findIndex((item) =>
      item.entityId.equals(entity.entityId),
    );
    if (indexFound === -1) {
      throw new NotFoundError(entity.entityId, this.getEntity());
    }
    this.data[indexFound] = entity;
  }

  async delete(entityId: EntityId): Promise<void> {
    const indexFound = this.data.findIndex((item) =>
      item.entityId.equals(entityId),
    );
    if (indexFound === -1) {
      throw new NotFoundError(entityId, this.getEntity());
    }
    this.data.splice(indexFound, 1);
  }

  async findById(entityId: EntityId): Promise<E | null> {
    const item = this.data.find((item) => item.entityId.equals(entityId));
    return typeof item === 'undefined' ? null : item;
  }

  async findAll(): Promise<any[]> {
    return this.data;
  }

  async findByIds(ids: EntityId[]): Promise<E[]> {
    //avoid to return repeated data
    return this.data.filter((entity) => {
      return ids.some((id) => entity.entityId.equals(id));
    });
  }

  async existsById(
    ids: EntityId[],
  ): Promise<{ exists: EntityId[]; not_exists: EntityId[] }> {
    if (!ids.length) {
      throw new Error('ids must be an array with at least one element');
    }

    if (this.data.length === 0) {
      return {
        exists: [],
        not_exists: ids,
      };
    }

    const existsId = new Set<EntityId>();
    const notExistsId = new Set<EntityId>();
    ids.forEach((id) => {
      const item = this.data.find((entity) => entity.entityId.equals(id));
      item ? existsId.add(id) : notExistsId.add(id);
    });
    return {
      exists: Array.from(existsId.values()),
      not_exists: Array.from(notExistsId.values()),
    };
  }

  abstract getEntity(): new (...args: any[]) => E;
}

export abstract class InMemorySearchableRepository<
    E extends Entity,
    EntityId extends ValueObject,
    Filter = string,
  >
  extends InMemoryRepository<E, EntityId>
  implements ISearchableRepository<E, EntityId, Filter>
{
  sortableFields: string[] = [];
  async search(props: SearchParams<Filter>): Promise<SearchResult<E>> {
    const dataFiltered = await this.applyFilter(this.data, props.filter);
    const dataSorted = this.applySort(
      dataFiltered,
      props.sort,
      props.sortDir,
    );
    const dataPaginated = this.applyPaginate(
      dataSorted,
      props.page,
      props.perPage,
    );
    return new SearchResult({
      data: dataPaginated,
      total: dataFiltered.length,
      currentPage: props.page,
      perPage: props.perPage,
    });
  }

  protected abstract applyFilter(
    data: E[],
    filter: Filter | null,
  ): Promise<E[]>;

  protected applyPaginate(
    data: E[],
    page: SearchParams['page'],
    perPage: SearchParams['perPage'],
  ) {
    const start = (page - 1) * perPage;
    const limit = start + perPage;
    return data.slice(start, limit);
  }

  protected applySort(
    data: E[],
    sort: string | null,
    sortDir: SortDirection | null,
    custom_getter?: (sort: string, item: E) => any,
  ) {
    if (!sort || !this.sortableFields.includes(sort)) {
      return data;
    }

    return [...data].sort((a, b) => {
      const aValue = custom_getter ? custom_getter(sort, a) : a[sort];
      const bValue = custom_getter ? custom_getter(sort, b) : b[sort];
      if (aValue < bValue) {
        return sortDir === 'asc' ? -1 : 1;
      }

      if (aValue > bValue) {
        return sortDir === 'asc' ? 1 : -1;
      }

      return 0;
    });
  }
}
