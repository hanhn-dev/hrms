import { pageOf, searchText } from "@hrms/db/page";

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function readListPage(value: string | string[] | undefined): number {
  const raw = first(value)?.trim() ?? "";
  if (raw === "") {
    return 1;
  }
  const parsed = Number(raw);
  return pageOf(Number.isInteger(parsed) ? parsed : null);
}

/** Empty and one-character values are no search. */
export function readListSearch(value: string | string[] | undefined): string | null {
  return searchText(first(value));
}

export function listHref(
  path: string,
  query: { page?: number; q?: string | null },
  extra?: Record<string, string | number | null | undefined>,
  options?: { pageParam?: string },
): string {
  const params = new URLSearchParams();
  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      if (value == null || value === "") {
        continue;
      }
      params.set(key, String(value));
    }
  }
  if (query.q) {
    params.set("q", query.q);
  }
  const pageParam = options?.pageParam ?? "page";
  if (query.page != null && query.page > 1) {
    params.set(pageParam, String(query.page));
  }
  const qs = params.toString();
  return qs === "" ? path : `${path}?${qs}`;
}
