import { SearchResult } from '../search-result';

describe('SearchResult Unit Tests', () => {
  test('constructor props', () => {
    let result = new SearchResult({
      data: ['entity1', 'entity2'] as any,
      total: 4,
      currentPage: 1,
      perPage: 2,
    });

    expect(result.toJSON()).toStrictEqual({
      data: ['entity1', 'entity2'] as any,
      total: 4,
      currentPage: 1,
      perPage: 2,
      lastPage: 2,
    });

    result = new SearchResult({
      data: ['entity1', 'entity2'] as any,
      total: 4,
      currentPage: 1,
      perPage: 2,
    });

    expect(result.toJSON()).toStrictEqual({
      data: ['entity1', 'entity2'] as any,
      total: 4,
      currentPage: 1,
      perPage: 2,
      lastPage: 2,
    });
  });

  it('should set lastPage = 1 when perPage field is greater than total field', () => {
    const result = new SearchResult({
      data: [] as any,
      total: 4,
      currentPage: 1,
      perPage: 15,
    });

    expect(result.lastPage).toBe(1);
  });

  test('lastPage prop when total is not a multiple of perPage', () => {
    const result = new SearchResult({
      data: [] as any,
      total: 101,
      currentPage: 1,
      perPage: 20,
    });

    expect(result.lastPage).toBe(6);
  });
});
