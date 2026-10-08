export type ColumnDataIndex = string | number | readonly (string | number)[];

/** Joins one column of the current table rows as `1874,1862,1863`. */
export function columnCopyText(
  rows: readonly object[],
  dataIndex: ColumnDataIndex,
): string {
  const values: string[] = [];
  for (const row of rows) {
    const text = formatCopyValue(readColumnValue(row, dataIndex));
    if (text != null) {
      values.push(text);
    }
  }
  return values.join(",");
}

function readColumnValue(row: object, dataIndex: ColumnDataIndex): unknown {
  if (typeof dataIndex === "string" || typeof dataIndex === "number") {
    return (row as Record<string, unknown>)[dataIndex];
  }
  let current: unknown = row;
  for (const key of dataIndex) {
    if (current == null || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

function formatCopyValue(value: unknown): string | null {
  if (value == null || value === "") {
    return null;
  }
  const text = String(value);
  if (text === "") {
    return null;
  }
  if (/[",\n\r]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}
