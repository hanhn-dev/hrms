export type MissingCustomerSettingColumn = {
  key: string;
  label: string;
  table: string;
  column: string;
};

export function missingColumnLine(column: {
  label: string;
  table: string;
  column: string;
}): string {
  return `${column.label} needs dbo.${column.table}.${column.column}, which is not in this database yet.`;
}

export function missingColumnLines(
  columns: readonly { label: string; table: string; column: string }[],
): string[] {
  return columns.map((column) => missingColumnLine(column));
}

export function missingColumnHeading(
  columns: readonly { label: string }[],
): string | null {
  const first = columns[0];
  if (!first) {
    return null;
  }
  return columns.length === 1
    ? `${first.label} is unavailable`
    : "Some settings are unavailable";
}
