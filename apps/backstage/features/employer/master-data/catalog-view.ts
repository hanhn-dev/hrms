export type CatalogListItem = {
  key: string;
  label: string;
  table: string;
  group: string;
};

export const CATALOG_GROUPS = [
  { id: "organization", label: "Organization" },
  { id: "profile", label: "Profile lookups" },
  { id: "other", label: "Other" },
] as const;

const GROUP_LABELS: Record<string, string> = Object.fromEntries(
  CATALOG_GROUPS.map((group) => [group.id, group.label]),
);

function needle(query: string): string {
  return query.trim().toLowerCase();
}

export function filterCatalogItems<T extends CatalogListItem>(
  items: readonly T[],
  query: string,
): T[] {
  const term = needle(query);
  if (!term) {
    return [...items];
  }
  return items.filter((item) => {
    const group = GROUP_LABELS[item.group] ?? item.group;
    return [item.label, item.key, item.table, group]
      .join(" ")
      .toLowerCase()
      .includes(term);
  });
}

export function filterDataRows<T extends Record<string, unknown>>(
  rows: readonly T[],
  query: string,
): T[] {
  const term = needle(query);
  if (!term) {
    return [...rows];
  }
  return rows.filter((row) =>
    Object.values(row).some((value) =>
      String(value ?? "").toLowerCase().includes(term),
    ),
  );
}
