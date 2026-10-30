/** Rows returned by one list query when the reader has not chosen a size. */
export const LIST_PAGE_SIZE = 25;

/** Sizes the table offers. Anything else falls back to {@link LIST_PAGE_SIZE}. */
export const LIST_PAGE_SIZES = [25, 50, 100, 200] as const;

export type ListPageSize = (typeof LIST_PAGE_SIZES)[number];

/** Employer switcher and other typeaheads. */
export const LOOKUP_LIMIT = 20;

export const LIST_PAGE_MAX = 10_000;

/** Shorter text is treated as no search so a single keystroke does not filter. */
export const SEARCH_MIN_LENGTH = 2;

export type PageQuery = {
  page: number;
  pageSize: number;
  offset: number;
};

export type PageResult<T> = {
  rows: T[];
  totalCount: number;
  page: number;
  pageSize: number;
};

export function pageOf(value: number | null | undefined): number {
  if (value == null || !Number.isInteger(value) || value < 1) {
    return 1;
  }
  return Math.min(value, LIST_PAGE_MAX);
}

export function pageSizeOf(value: number | null | undefined): ListPageSize {
  if (
    value != null &&
    Number.isInteger(value) &&
    (LIST_PAGE_SIZES as readonly number[]).includes(value)
  ) {
    return value as ListPageSize;
  }
  return LIST_PAGE_SIZE;
}

export function pageQuery(
  value: number | null | undefined,
  pageSize: number | null | undefined = LIST_PAGE_SIZE,
): PageQuery {
  const page = pageOf(value);
  const size = pageSizeOf(pageSize);
  return {
    page,
    pageSize: size,
    offset: (page - 1) * size,
  };
}

/**
 * Empty and one-character searches are ignored. The list then returns page 1
 * of the ordered set instead of every row.
 */
export function searchText(
  value: string | null | undefined,
  maxLength = 200,
): string | null {
  const trimmed = value?.trim() ?? "";
  if (trimmed.length < SEARCH_MIN_LENGTH || trimmed.length > maxLength) {
    return null;
  }
  return trimmed;
}

/** `LIKE` pattern that treats `%`, `_`, and `[` in the user's text as literals. */
export function likeContains(value: string): string {
  return `%${value.replace(/[[%_\]]/g, "[$&]")}%`;
}

export function totalCountOf(value: number | bigint | null | undefined): number {
  if (value == null) {
    return 0;
  }
  const count = Number(value);
  return Number.isFinite(count) ? count : 0;
}
