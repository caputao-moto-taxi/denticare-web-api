import { Entity } from '../../entity';
import { SearchResult } from '../search-result';
import { Uuid } from '../../value-objects/uuid.vo';

class StubEntity extends Entity {
  readonly entityId = new Uuid();

  constructor(readonly name: string) {
    super();
  }

  toJSON() {
    return { id: this.entityId.value, name: this.name };
  }
}

describe('SearchResult Unit Tests', () => {
  test('constructor props', () => {
    const data = [new StubEntity('entity1'), new StubEntity('entity2')];
    let result = new SearchResult({
      data,
      total: 4,
      currentPage: 1,
      perPage: 2,
    });

    expect(result.toJSON()).toStrictEqual({
      data,
      total: 4,
      currentPage: 1,
      perPage: 2,
      lastPage: 2,
    });

    result = new SearchResult({
      data,
      total: 4,
      currentPage: 1,
      perPage: 2,
    });

    expect(result.toJSON()).toStrictEqual({
      data,
      total: 4,
      currentPage: 1,
      perPage: 2,
      lastPage: 2,
    });
  });

  it('should set lastPage = 1 when perPage field is greater than total field', () => {
    const result = new SearchResult({
      data: [],
      total: 4,
      currentPage: 1,
      perPage: 15,
    });

    expect(result.lastPage).toBe(1);
  });

  test('lastPage prop when total is not a multiple of perPage', () => {
    const result = new SearchResult({
      data: [],
      total: 101,
      currentPage: 1,
      perPage: 20,
    });

    expect(result.lastPage).toBe(6);
  });
});
