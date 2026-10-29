import { LIST_PAGE_MAX, LIST_PAGE_SIZE } from "../../shared/page.ts";

export const UNSECTIONED_SECTION_NAME = "Unsectioned";

export type FieldSectionSummary = {
  sectionId: number | null;
  section: string;
  fieldCount: number;
};

export type FieldEntitySelection =
  | { kind: "all" }
  | { kind: "none" }
  | { kind: "some"; entities: string[] };

/**
 * `null` skips the entity predicate. An empty list matches no rows.
 * Names are trimmed and de-duplicated without changing their spelling.
 */
export function fieldEntitySelection(
  entities: readonly string[] | null | undefined,
): FieldEntitySelection {
  if (entities == null) {
    return { kind: "all" };
  }
  const seen = new Set<string>();
  const names: string[] = [];
  for (const entity of entities) {
    const trimmed = entity.trim();
    if (trimmed === "") {
      continue;
    }
    const key = trimmed.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    names.push(trimmed);
  }
  if (names.length === 0) {
    return { kind: "none" };
  }
  return { kind: "some", entities: names };
}

/** 1-based row number within a section, using the list page size. */
export function pageForFieldRow(
  rowNumber: number | null | undefined,
  pageSize: number = LIST_PAGE_SIZE,
): number {
  if (rowNumber == null || !Number.isInteger(rowNumber) || rowNumber < 1) {
    return 1;
  }
  const size = Number.isInteger(pageSize) && pageSize > 0 ? pageSize : LIST_PAGE_SIZE;
  return Math.min(LIST_PAGE_MAX, Math.ceil(rowNumber / size));
}
