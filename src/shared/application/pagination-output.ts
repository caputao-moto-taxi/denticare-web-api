import { SearchResult } from '../domain/repository/search-result';

export type PaginationOutput<Item = unknown> = {
  data: Item[];
  total: number;
  currentPage: number;
  lastPage: number;
  perPage: number;
};

export class PaginationOutputMapper {
  static toOutput<Item = unknown>(
    data: Item[],
    props: Omit<SearchResult, 'data'>,
  ): PaginationOutput<Item> {
    return {
      data,
      total: props.total,
      currentPage: props.currentPage,
      lastPage: props.lastPage,
      perPage: props.perPage,
    };
  }
}
