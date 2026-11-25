import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { AuthUser } from '../../auth/auth-user';
import { ListQuery } from '../../shared/domain/list-query';
import { STAFF_ROLES } from '../../shared/helpers/staff';
import { StockCatalogKind } from '../domain/stock.repository';

export function requireStockStaff(user: AuthUser) {
  if (!STAFF_ROLES.has(user.role)) {
    throw new ForbiddenException('Clinic staff access is required');
  }
}

export function requireStockAdministrator(user: AuthUser) {
  if (user.role !== 'admin') {
    throw new ForbiddenException(
      'Only clinic administrators can remove stock items',
    );
  }
}

export function assertStockCapacity(quantity: number, capacity: number) {
  if (quantity > capacity) {
    throw new BadRequestException('Quantity cannot exceed the capacity');
  }
}

export function assertUniqueSaleItems(ids: string[]) {
  if (new Set(ids).size !== ids.length) {
    throw new BadRequestException(
      'A stock item can only appear once in a sale',
    );
  }
}

export function assertValidSaleUpdate(ids: string[]) {
  if (!ids.length || new Set(ids).size !== ids.length) {
    throw new BadRequestException(
      'A sale must contain unique stock items and at least one item',
    );
  }
}

export function assertValidStockListQuery(
  query: ListQuery = {},
  supportedFilters: Partial<Record<string, readonly string[] | true>> = {},
) {
  for (const [key, value] of Object.entries(query)) {
    if (
      ['page', 'pageSize', 'search', 'dateFrom', 'dateTo'].includes(key) ||
      value === undefined ||
      value === ''
    ) {
      continue;
    }
    const allowed = supportedFilters[key];
    if (!allowed || (allowed !== true && !allowed.includes(String(value)))) {
      throw new BadRequestException(`Invalid or unsupported ${key} filter`);
    }
  }
  if (query.dateFrom && query.dateTo && query.dateFrom > query.dateTo) {
    throw new BadRequestException('Start date must not be after end date');
  }
}

export function normalizeStockText<
  T extends {
    name?: string;
    supplier?: string;
    notes?: string;
  },
>(input: T): T {
  return {
    ...input,
    ...(input.name !== undefined && { name: input.name.trim() }),
    ...(input.supplier !== undefined && { supplier: input.supplier.trim() }),
    ...(input.notes !== undefined && { notes: input.notes.trim() }),
  };
}

export function normalizeCatalogName(
  kind: StockCatalogKind,
  name: string,
): { kind: StockCatalogKind; name: string } {
  return { kind, name: name.trim().replace(/\s+/g, ' ') };
}

export function stockCatalogError(kind: StockCatalogKind) {
  throw new BadRequestException(
    `The selected stock ${kind} is not registered for this clinic`,
  );
}
