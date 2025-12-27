import { SearchResult } from '../domain/repository/search-result';

export type PaginationOutput<Item = any> = {
  data: Item[];
  total: number;
  currentPage: number;
  lastPage: number;
  perPage: number;
};

export class PaginationOutputMapper {
  static toOutput<Item = any>(
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
