import { BadRequestException } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { ListQuery } from '../domain/list-query';

type FilterKey = Exclude<
  keyof ListQuery,
  'page' | 'pageSize' | 'search' | 'dateFrom' | 'dateTo'
>;

export function validateListFilters(
  query: ListQuery,
  supported: Partial<Record<FilterKey, readonly string[] | true>> = {},
) {
  for (const key of [
    'status',
    'role',
    'category',
    'specialty',
    'type',
    'doctorId',
    'patientId',
  ] as const) {
    const value = query[key];
    if (!value) continue;
    const allowed = supported[key];
    if (!allowed || (allowed !== true && !allowed.includes(value))) {
      throw new BadRequestException(`Invalid or unsupported ${key} filter`);
    }
  }
}

export function personSearch(search: string): Prisma.PersonWhereInput {
  return {
    deletedAt: null,
    AND: search
      .trim()
      .split(/\s+/)
      .map((word) => ({
        OR: [
          { firstName: { contains: word, mode: 'insensitive' } },
          { lastName: { contains: word, mode: 'insensitive' } },
          { email: { contains: word, mode: 'insensitive' } },
          { phoneNumber: { contains: word, mode: 'insensitive' } },
        ],
      })),
  };
}

export function dateRange(query: ListQuery) {
  if (query.dateFrom && query.dateTo && query.dateFrom > query.dateTo) {
    throw new BadRequestException('Start date must not be after end date');
  }
  return {
    ...(query.dateFrom && { gte: new Date(`${query.dateFrom}T00:00:00.000Z`) }),
    ...(query.dateTo && {
      lt: new Date(
        new Date(`${query.dateTo}T00:00:00.000Z`).getTime() + 86400000,
      ),
    }),
  };
}
