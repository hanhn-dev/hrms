import { LIST_PAGE_SIZES } from "@hrms/db/page";

/** How many rows are painted on the current page. */
export function pageRowCountLabel(count: number): string {
  return count === 1 ? "1 row" : `${count} rows`;
}

/** Offered sizes, plus the current size when a table already uses another one. */
export function pageSizeChoices(current: number): number[] {
  if ((LIST_PAGE_SIZES as readonly number[]).includes(current)) {
    return [...LIST_PAGE_SIZES];
  }
  return [current, ...LIST_PAGE_SIZES].sort((left, right) => left - right);
}
