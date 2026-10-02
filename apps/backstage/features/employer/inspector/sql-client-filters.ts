export type SqlClientFilter = {
  column: string;
  value: string;
};

export function appliedColumnFilters(drafts: readonly SqlClientFilter[]): SqlClientFilter[] {
  const byColumn = new Map<string, SqlClientFilter>();
  for (const draft of drafts) {
    const column = draft.column.trim();
    const value = draft.value.trim();
    if (column === "" || value === "") {
      continue;
    }
    byColumn.set(column.toLowerCase(), { column, value });
  }
  return [...byColumn.values()];
}
