import {
  MASTER_DATA_GROUPS,
  type MasterDataEntry,
  type MasterDataRow,
  type MasterDataValue,
} from "./catalog.ts";

function normalizedQuery(query: string): string {
  return query.trim().toLowerCase();
}

export function filterMasterDataCatalog(
  entries: readonly MasterDataEntry[],
  query: string,
): MasterDataEntry[] {
  const needle = normalizedQuery(query);
  if (!needle) {
    return [...entries];
  }
  return entries.filter((entry) => {
    const group =
      MASTER_DATA_GROUPS.find((item) => item.id === entry.group)?.label ?? "";
    const haystack = [entry.label, entry.key, entry.table, group]
      .join(" ")
      .toLowerCase();
    return haystack.includes(needle);
  });
}

function cellText(value: MasterDataValue): string {
  if (value == null) {
    return "";
  }
  return String(value);
}

export function filterMasterDataRows(
  rows: readonly MasterDataRow[],
  query: string,
): MasterDataRow[] {
  const needle = normalizedQuery(query);
  if (!needle) {
    return [...rows];
  }
  return rows.filter((row) =>
    Object.values(row).some((value) => cellText(value).toLowerCase().includes(needle)),
  );
}
