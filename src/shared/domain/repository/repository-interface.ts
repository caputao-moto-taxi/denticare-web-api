import { Entity } from '../entity';
import { ValueObject } from '../value-object';
import { SearchParams } from './search-params';
import { SearchResult } from './search-result';

export interface IRepository<E extends Entity, EntityId extends ValueObject> {
  insert(entity: E): Promise<void>;
  bulkInsert(entities: E[]): Promise<void>;
  findById(entityId: EntityId): Promise<E | null>;
  findByIds(ids: EntityId[]): Promise<E[]>;
  findAll(): Promise<E[]>;
  update(entity: E): Promise<void>;
  delete(entityId: EntityId): Promise<void>;
  getEntity(): new (...args: any[]) => E;
}
export interface ISearchableRepository<
  E extends Entity,
  EntityId extends ValueObject,
  Filter = string,
  SearchInput = SearchParams<Filter>,
  SearchOutput = SearchResult,
> extends IRepository<E, EntityId> {
  sortableFields: string[];
  search(props: SearchInput): Promise<SearchOutput>;
}
