import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { ListQueryDto } from './list-query.dto';
import {
  dateRange,
  personSearch,
  validateListFilters,
} from '../../helpers/list-filters';
import { pageWindow, paginated } from '../../domain/list-query';

describe('Listing query contract', () => {
  const pipe = new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  const parse = (query: object): Promise<ListQueryDto> =>
    pipe.transform(query, { type: 'query', metatype: ListQueryDto });

  it('defaults to the first ten results', async () => {
    const query = await parse({});
    expect(pageWindow(query)).toEqual({ skip: 0, take: 10 });
    expect(paginated([], 0, query)).toEqual({
      data: [],
      meta: { page: 1, pageSize: 10, total: 0, totalPages: 0 },
    });
  });

  it.each([10, 25, 50])(
    'accepts page size %i and transforms query strings',
    async (size) => {
      const query = await parse({
        page: '3',
        pageSize: String(size),
        search: ' Ana Costa ',
      });
      expect(query).toMatchObject({
        page: 3,
        pageSize: size,
        search: 'Ana Costa',
      });
      expect(pageWindow(query)).toEqual({ skip: size * 2, take: size });
    },
  );

  it.each([
    { page: '0' },
    { page: '-1' },
    { page: '1.5' },
    { page: 'NaN' },
    { page: '1000001' },
    { pageSize: '1000' },
    { pageSize: '0' },
    { pageSize: '11' },
    { search: ['a', 'b'] },
    { search: 'a'.repeat(201) },
    { dateFrom: '2026-02-30' },
    { dateTo: '2026-01-01T00:00:00Z' },
    { status: 'invalid' },
    { role: 'super-admin' },
    { surprise: 'ignored' },
  ])('rejects invalid input %p', async (query) => {
    await expect(parse(query)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('retains the filtered total and rounds the last page up', () => {
    expect(paginated([{ id: 'last' }], 51, { page: 3, pageSize: 25 })).toEqual({
      data: [{ id: 'last' }],
      meta: { page: 3, pageSize: 25, total: 51, totalPages: 3 },
    });
    expect(paginated([], 51, { page: 4, pageSize: 25 }).meta).toMatchObject({
      page: 4,
      total: 51,
      totalPages: 3,
    });
  });

  it('uses an inclusive UTC date range with an exclusive next-day boundary', () => {
    expect(dateRange({ dateFrom: '2026-12-31', dateTo: '2026-12-31' })).toEqual(
      {
        gte: new Date('2026-12-31T00:00:00Z'),
        lt: new Date('2027-01-01T00:00:00Z'),
      },
    );
    expect(dateRange({})).toEqual({});
    expect(() =>
      dateRange({ dateFrom: '2026-10-02', dateTo: '2026-10-01' }),
    ).toThrow(BadRequestException);
  });

  it('rejects unsupported filters rather than returning misleading results', () => {
    expect(() =>
      validateListFilters(
        { status: 'completed' },
        { status: ['active', 'inactive'] },
      ),
    ).toThrow(BadRequestException);
    expect(() => validateListFilters({ doctorId: 'doctor-1' })).toThrow(
      BadRequestException,
    );
    expect(() =>
      validateListFilters(
        { status: 'active' },
        { status: ['active', 'inactive'] },
      ),
    ).not.toThrow();
  });

  it('matches every word of a full name across person fields', () => {
    expect(personSearch('Ana Costa')).toEqual({
      deletedAt: null,
      AND: ['Ana', 'Costa'].map((word) => ({
        OR: ['firstName', 'lastName', 'email', 'phoneNumber'].map((field) => ({
          [field]: { contains: word, mode: 'insensitive' },
        })),
      })),
    });
  });
});
