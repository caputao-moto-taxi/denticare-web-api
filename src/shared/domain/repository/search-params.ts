import { ValueObject } from '../value-object';

export type SortDirection = 'asc' | 'desc';

export type SearchParamsConstructorProps = {
  page?: unknown;
  perPage?: unknown;
  sort?: unknown;
  sortDir?: unknown;
  filter?: unknown;
};

export class SearchParams<Filter = string> extends ValueObject {
  protected _page: number;
  protected _perPage: number = 15;
  protected _sort: string | null;
  protected _sortDir: SortDirection | null;
  protected _filter: Filter | null;

  constructor(props: SearchParamsConstructorProps = {}) {
    super();
    this.page = props.page!;
    this.perPage = props.perPage!;
    this.sort = props.sort!;
    this.sortDir = props.sortDir!;
    this.filter = props.filter!;
  }

  get page(): number {
    return this._page;
  }

  private set page(value: unknown) {
    this._page = positiveInteger(value, 1);
  }

  get perPage(): number {
    return this._perPage;
  }

  private set perPage(value: unknown) {
    this._perPage = positiveInteger(value, this._perPage);
  }

  get sort(): string | null {
    return this._sort;
  }

  private set sort(value: unknown) {
    this._sort =
      value === null || value === undefined || value === ''
        ? null
        : String(value);
  }

  get sortDir(): SortDirection | null {
    return this._sortDir;
  }

  private set sortDir(value: unknown) {
    if (!this.sort) {
      this._sortDir = null;
      return;
    }
    const dir = String(value).toLowerCase();
    this._sortDir = dir !== 'asc' && dir !== 'desc' ? 'asc' : dir;
  }

  get filter(): Filter | null {
    return this._filter;
  }

  protected set filter(value: unknown) {
    this._filter =
      value === null || value === undefined || value === ''
        ? null
        : (String(value) as Filter);
  }
}

function positiveInteger(value: unknown, fallback: number): number {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim() !== ''
        ? Number(value)
        : Number.NaN;
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
