export interface ListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  role?: string;
  category?: string;
  specialty?: string;
  type?: string;
  doctorId?: string;
  patientId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export function pageWindow(query: ListQuery) {
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 10;
  return { skip: (page - 1) * pageSize, take: pageSize };
}

export function paginated<T>(
  data: T[],
  total: number,
  query: ListQuery,
): PaginatedResult<T> {
  const pageSize = query.pageSize ?? 10;
  return {
    data,
    meta: {
      page: query.page ?? 1,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}
