import { formatDate } from "@/shared/format-date";

export function dataFixNextLabel(setNull: boolean, newText: string): string {
  if (setNull) {
    return "NULL";
  }
  return newText.trim();
}

export function dataFixPreviewRows(input: {
  column: string;
  keyColumns: readonly string[];
  sample: ReadonlyArray<Record<string, unknown>>;
  nextValue: string;
}): Array<Record<string, string>> {
  return input.sample.map((row) => {
    const record: Record<string, string> = {};
    for (const key of input.keyColumns) {
      if (key.toLowerCase() === input.column.toLowerCase()) {
        continue;
      }
      record[key] = cellText(cellValue(row, key));
    }
    record["Current value"] = cellText(cellValue(row, input.column));
    record["New value"] = input.nextValue;
    return record;
  });
}

function cellValue(row: Record<string, unknown>, name: string): unknown {
  if (name in row) {
    return row[name];
  }
  const found = Object.keys(row).find((key) => key.toLowerCase() === name.toLowerCase());
  return found ? row[found] : undefined;
}

function cellText(value: unknown): string {
  if (value == null) {
    return "NULL";
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return formatDate(value);
  }
  return String(value);
}
