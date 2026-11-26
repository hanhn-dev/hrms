export const DEFAULT_FIELD_ENTITIES = ["System", "Country", "Custom"] as const;

export function sectionAccordionKey(sectionId: number | null): string {
  return sectionId == null ? "none" : String(sectionId);
}

export function fieldSectionTotal(sections: readonly { fieldCount: number }[]): number {
  return sections.reduce((sum, section) => sum + section.fieldCount, 0);
}

export function sectionTableIsOpen(activeKeys: readonly string[], key: string): boolean {
  return activeKeys.includes(key);
}

export function sameEntitySelection(
  left: readonly string[],
  right: readonly string[],
): boolean {
  const normalize = (values: readonly string[]) =>
    [
      ...new Set(
        values
          .map((entity) => entity.trim().toLowerCase())
          .filter((entity) => entity !== ""),
      ),
    ].sort();
  const normalizedLeft = normalize(left);
  const normalizedRight = normalize(right);
  return (
    normalizedLeft.length === normalizedRight.length &&
    normalizedLeft.every((entity, index) => entity === normalizedRight[index])
  );
}

/** A field deep link opens one section. Filter changes leave every section closed. */
export function fieldLinkOpenKey(
  honorFieldLink: boolean,
  sectionId: number | null,
  known: boolean,
): string | null {
  if (!honorFieldLink || !known) {
    return null;
  }
  return sectionAccordionKey(sectionId);
}

export function sectionTablePagination(
  result: { page: number; pageSize: number; totalCount: number } | null,
  onPage: (page: number, pageSize?: number) => void,
):
  | {
      current: number;
      pageSize: number;
      total: number;
      showSizeChanger: false;
      onChange: (page: number, pageSize: number) => void;
    }
  | false {
  if (result == null || result.pageSize <= 0 || result.totalCount <= result.pageSize) {
    return false;
  }
  return {
    current: result.page,
    pageSize: result.pageSize,
    total: result.totalCount,
    showSizeChanger: false,
    onChange: (page, pageSize) => {
      onPage(page, pageSize);
    },
  };
}

/** Stable key for the in-flight section page load (revision, page, size, search). */
export function sectionPageRequestKey(
  revision: number,
  explicitPage: number | null,
  pageSize: number | null,
  searchQuery: string,
): string {
  return `${revision}:${explicitPage ?? "focus"}:${pageSize ?? "default"}:${searchQuery}`;
}

/**
 * In-table search asks the server with `q` and returns to page 1.
 * Does not touch the URL `?q=` used by the page-level field search.
 */
export function sectionTableSearchState(query: string): {
  searchQuery: string;
  explicitPage: number;
} {
  return { searchQuery: query, explicitPage: 1 };
}
