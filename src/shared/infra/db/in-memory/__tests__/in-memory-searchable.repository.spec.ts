import { Entity } from '../../../../domain/entity';
import { SearchParams } from '../../../../domain/repository/search-params';
import { SearchResult } from '../../../../domain/repository/search-result';
import { Uuid } from '../../../../domain/value-objects/uuid.vo';
import { InMemorySearchableRepository } from '../in-memory.repository';

type StubEntityConstructorProps = {
  entityId?: Uuid;
  name: string;
  price: number;
};

class StubEntity extends Entity {
  entityId: Uuid;
  name: string;
  price: number;
  constructor(props: StubEntityConstructorProps) {
    super();
    this.entityId = props.entityId ?? new Uuid();
    this.name = props.name;
    this.price = +props.price;
  }

  toJSON(): { id: string } & StubEntityConstructorProps {
    return {
      id: this.entityId.value,
      name: this.name,
      price: this.price,
    };
  }
}

class StubInMemorySearchableRepository extends InMemorySearchableRepository<
  StubEntity,
  Uuid
> {
  sortableFields: string[] = ['name'];

  getEntity(): new (...args: any[]) => StubEntity {
    return StubEntity;
  }

  protected async applyFilter(
    data: StubEntity[],
    filter: string | null,
  ): Promise<StubEntity[]> {
    if (!filter) {
      return data;
    }

    return data.filter((i) => {
      return (
        i.name.toLowerCase().includes(filter.toLowerCase()) ||
        i.price.toString() === filter
      );
    });
  }
}
describe('InMemorySearchableRepository Unit Tests', () => {
  let repository: StubInMemorySearchableRepository;

  beforeEach(() => (repository = new StubInMemorySearchableRepository()));

  describe('applyFilter method', () => {
    it('should no filter data when filter param is null', async () => {
      const data = [new StubEntity({ name: 'name value', price: 5 })];
      const spyFilterMethod = jest.spyOn(data, 'filter' as any);
      const dataFiltered = await repository['applyFilter'](data, null);
      expect(dataFiltered).toStrictEqual(data);
      expect(spyFilterMethod).not.toHaveBeenCalled();
    });

    it('should filter using a filter param', async () => {
      const data = [
        new StubEntity({ name: 'test', price: 5 }),
        new StubEntity({ name: 'TEST', price: 5 }),
        new StubEntity({ name: 'fake', price: 0 }),
      ];

      const spyFilterMethod = jest.spyOn(data, 'filter' as any);
      let dataFiltered = await repository['applyFilter'](data, 'TEST');

      expect(dataFiltered).toStrictEqual([data[0], data[1]]);
      expect(spyFilterMethod).toHaveBeenCalledTimes(1);

      dataFiltered = await repository['applyFilter'](data, '5');
      expect(dataFiltered).toStrictEqual([data[0], data[1]]);
      expect(spyFilterMethod).toHaveBeenCalledTimes(2);

      dataFiltered = await repository['applyFilter'](data, 'no-filter');
      expect(dataFiltered).toHaveLength(0);
      expect(spyFilterMethod).toHaveBeenCalledTimes(3);
    });
  });

  describe('applySort method', () => {
    it('should no sort data', async () => {
      const data = [
        new StubEntity({ name: 'b', price: 5 }),
        new StubEntity({ name: 'a', price: 5 }),
      ];

      let dataSorted = await repository['applySort'](data, null, null);
      expect(dataSorted).toStrictEqual(data);

      dataSorted = await repository['applySort'](data, 'price', 'asc');
      expect(dataSorted).toStrictEqual(data);
    });

    it('should sort data', async () => {
      const data = [
        new StubEntity({ name: 'b', price: 5 }),
        new StubEntity({ name: 'a', price: 5 }),
        new StubEntity({ name: 'c', price: 5 }),
      ];

      let dataSorted = await repository['applySort'](data, 'name', 'asc');
      expect(dataSorted).toStrictEqual([data[1], data[0], data[2]]);

      dataSorted = await repository['applySort'](data, 'name', 'desc');
      expect(dataSorted).toStrictEqual([data[2], data[0], data[1]]);
    });
  });

  describe('applyPaginate method', () => {
    it('should paginate data', async () => {
      const data = [
        new StubEntity({ name: 'a', price: 5 }),
        new StubEntity({ name: 'b', price: 5 }),
        new StubEntity({ name: 'c', price: 5 }),
        new StubEntity({ name: 'd', price: 5 }),
        new StubEntity({ name: 'e', price: 5 }),
      ];

      let dataPaginated = await repository['applyPaginate'](data, 1, 2);
      expect(dataPaginated).toStrictEqual([data[0], data[1]]);

      dataPaginated = await repository['applyPaginate'](data, 2, 2);
      expect(dataPaginated).toStrictEqual([data[2], data[3]]);

      dataPaginated = await repository['applyPaginate'](data, 3, 2);
      expect(dataPaginated).toStrictEqual([data[4]]);

      dataPaginated = await repository['applyPaginate'](data, 4, 2);
      expect(dataPaginated).toStrictEqual([]);
    });
  });

  describe('search method', () => {
    it('should apply only paginate when other params are null', async () => {
      const entity = new StubEntity({ name: 'a', price: 5 });
      const data = Array(16).fill(entity);
      repository.data = data;

      const result = await repository.search(new SearchParams());
      expect(result).toStrictEqual(
        new SearchResult({
          data: Array(15).fill(entity),
          total: 16,
          currentPage: 1,
          perPage: 15,
        }),
      );
    });

    it('should apply paginate and filter', async () => {
      const data = [
        new StubEntity({ name: 'test', price: 5 }),
        new StubEntity({ name: 'a', price: 5 }),
        new StubEntity({ name: 'TEST', price: 5 }),
        new StubEntity({ name: 'TeSt', price: 5 }),
      ];
      repository.data = data;

      let result = await repository.search(
        new SearchParams({ page: 1, perPage: 2, filter: 'TEST' }),
      );
      expect(result).toStrictEqual(
        new SearchResult({
          data: [data[0], data[2]],
          total: 3,
          currentPage: 1,
          perPage: 2,
        }),
      );

      result = await repository.search(
        new SearchParams({ page: 2, perPage: 2, filter: 'TEST' }),
      );
      expect(result).toStrictEqual(
        new SearchResult({
          data: [data[3]],
          total: 3,
          currentPage: 2,
          perPage: 2,
        }),
      );
    });

    describe('should apply paginate and sort', () => {
      const data = [
        new StubEntity({ name: 'b', price: 5 }),
        new StubEntity({ name: 'a', price: 5 }),
        new StubEntity({ name: 'd', price: 5 }),
        new StubEntity({ name: 'e', price: 5 }),
        new StubEntity({ name: 'c', price: 5 }),
      ];
      const arrange = [
        {
          search_params: new SearchParams({
            page: 1,
            perPage: 2,
            sort: 'name',
          }),
          search_result: new SearchResult({
            data: [data[1], data[0]],
            total: 5,
            currentPage: 1,
            perPage: 2,
          }),
        },
        {
          search_params: new SearchParams({
            page: 2,
            perPage: 2,
            sort: 'name',
          }),
          search_result: new SearchResult({
            data: [data[4], data[2]],
            total: 5,
            currentPage: 2,
            perPage: 2,
          }),
        },
        {
          search_params: new SearchParams({
            page: 1,
            perPage: 2,
            sort: 'name',
            sortDir: 'desc',
          }),
          search_result: new SearchResult({
            data: [data[3], data[2]],
            total: 5,
            currentPage: 1,
            perPage: 2,
          }),
        },
        {
          search_params: new SearchParams({
            page: 2,
            perPage: 2,
            sort: 'name',
            sortDir: 'desc',
          }),
          search_result: new SearchResult({
            data: [data[4], data[0]],
            total: 5,
            currentPage: 2,
            perPage: 2,
          }),
        },
      ];

      beforeEach(() => {
        repository.data = data;
      });

      test.each(arrange)(
        'when value is %j',
        async ({ search_params, search_result }) => {
          const result = await repository.search(search_params);
          expect(result).toStrictEqual(search_result);
        },
      );
    });

    it('should search using filter, sort and paginate', async () => {
      const data = [
        new StubEntity({ name: 'test', price: 5 }),
        new StubEntity({ name: 'a', price: 5 }),
        new StubEntity({ name: 'TEST', price: 5 }),
        new StubEntity({ name: 'e', price: 5 }),
        new StubEntity({ name: 'TeSt', price: 5 }),
      ];
      repository.data = data;

      const arrange = [
        {
          params: new SearchParams({
            page: 1,
            perPage: 2,
            sort: 'name',
            filter: 'TEST',
          }),
          result: new SearchResult({
            data: [data[2], data[4]],
            total: 3,
            currentPage: 1,
            perPage: 2,
          }),
        },
        {
          params: new SearchParams({
            page: 2,
            perPage: 2,
            sort: 'name',
            filter: 'TEST',
          }),
          result: new SearchResult({
            data: [data[0]],
            total: 3,
            currentPage: 2,
            perPage: 2,
          }),
        },
      ];

      for (const i of arrange) {
        const result = await repository.search(i.params);
        expect(result).toStrictEqual(i.result);
      }
    });
  });
});
