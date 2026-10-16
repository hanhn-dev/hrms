import type { ScriptObjectKind } from "@/features/employer/inspector/queries";

export type TableColumnDetail = {
  name: string;
  type: string;
  length: string;
  nullable: boolean;
  identity: boolean;
  primaryKey: boolean;
  foreignKey: boolean;
};

export type TableColumnRow = {
  name: string;
  type: string;
  length: string;
  nullable: "Yes" | "No";
  identity: "Yes" | "No";
  primaryKey: boolean;
  foreignKey: boolean;
};

export const MODULE_POPOVER_ACTIONS = ["View script", "Execute"] as const;

function yesNo(value: boolean): "Yes" | "No" {
  return value ? "Yes" : "No";
}

export function tableColumnRows(columns: readonly TableColumnDetail[] | null): TableColumnRow[] {
  return (columns ?? []).map((column) => ({
    name: column.name,
    type: column.type,
    length: column.length,
    nullable: yesNo(column.nullable),
    identity: yesNo(column.identity),
    primaryKey: column.primaryKey,
    foreignKey: column.foreignKey,
  }));
}

export function filterTableColumnRows(
  rows: readonly TableColumnRow[],
  query: string,
): TableColumnRow[] {
  const text = query.trim().toLowerCase();
  if (text.length === 0) {
    return [...rows];
  }
  return rows.filter((row) =>
    `${row.name} ${row.type} ${row.length}`.toLowerCase().includes(text),
  );
}

export function columnRowClass(row: Pick<TableColumnRow, "primaryKey" | "foreignKey">): string {
  if (row.primaryKey && row.foreignKey) {
    return "[&>td]:!bg-amber-50 dark:[&>td]:!bg-amber-950 [&>td:first-child]:!border-l-4 [&>td:first-child]:!border-solid [&>td:first-child]:!border-l-sky-500";
  }
  if (row.primaryKey) {
    return "[&>td]:!bg-amber-50 dark:[&>td]:!bg-amber-950";
  }
  if (row.foreignKey) {
    return "[&>td]:!bg-sky-50 dark:[&>td]:!bg-sky-950";
  }
  return "";
}

export function usedObjectPopoverContent(
  kind: ScriptObjectKind,
  columns: readonly TableColumnDetail[] | null,
):
  | { kind: "columns"; rows: TableColumnRow[] }
  | { kind: "actions"; actions: typeof MODULE_POPOVER_ACTIONS } {
  if (kind === "table") {
    return { kind: "columns", rows: tableColumnRows(columns) };
  }
  return { kind: "actions", actions: MODULE_POPOVER_ACTIONS };
}
