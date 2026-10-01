import {
  editableMasterDataColumns,
  type MasterDataColumn,
  type MasterDataEntry,
  type MasterDataRow,
  type MasterDataValue,
} from "./catalog.ts";

export type MasterDataWriteMode = "insert" | "update" | "delete";

function columnByName(
  columns: readonly MasterDataColumn[],
  name: string,
): MasterDataColumn | null {
  return columns.find((column) => column.name === name) ?? null;
}

function parseText(column: MasterDataColumn, value: unknown): string | null {
  if (value == null || value === "") {
    return null;
  }
  if (typeof value !== "string") {
    throw new Error(`${column.label} must be text.`);
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  if (column.maxLength != null && trimmed.length > column.maxLength) {
    throw new Error(`${column.label} must be at most ${column.maxLength} characters.`);
  }
  return trimmed;
}

function parseIntValue(column: MasterDataColumn, value: unknown): number | null {
  if (value == null || value === "") {
    return null;
  }
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(parsed)) {
    throw new Error(`${column.label} must be a whole number.`);
  }
  return parsed;
}

function parseBit(column: MasterDataColumn, value: unknown): boolean | null {
  if (value == null || value === "") {
    return null;
  }
  if (typeof value === "boolean") {
    return value;
  }
  if (value === 1 || value === "1" || value === "Y" || value === "true") {
    return true;
  }
  if (value === 0 || value === "0" || value === "N" || value === "false") {
    return false;
  }
  throw new Error(`${column.label} must be active or inactive.`);
}

function parseYn(column: MasterDataColumn, value: unknown): "Y" | "N" | null {
  if (value == null || value === "") {
    return null;
  }
  if (value === true || value === "Y" || value === "y") {
    return "Y";
  }
  if (value === false || value === "N" || value === "n") {
    return "N";
  }
  throw new Error(`${column.label} must be Active or In Active.`);
}

function parseColumn(column: MasterDataColumn, value: unknown): MasterDataValue {
  switch (column.kind) {
    case "text":
      return parseText(column, value);
    case "int":
      return parseIntValue(column, value);
    case "bit":
      return parseBit(column, value);
    case "yn":
      return parseYn(column, value);
    default: {
      const unreachable: never = column.kind;
      throw new Error(`Unsupported column kind ${String(unreachable)}.`);
    }
  }
}

export function parseMasterDataValues(
  entry: MasterDataEntry,
  values: Record<string, unknown>,
  mode: "insert" | "update",
): Record<string, MasterDataValue> {
  const allowed = editableMasterDataColumns(entry, mode);
  const parsed: Record<string, MasterDataValue> = {};
  for (const [name, value] of Object.entries(values)) {
    const column = columnByName(allowed, name);
    if (!column) {
      throw new Error(`${name} is not editable on ${entry.label}.`);
    }
    parsed[name] = parseColumn(column, value);
  }
  if (mode === "insert") {
    for (const column of allowed) {
      if (!column.required) {
        continue;
      }
      const value = parsed[column.name];
      if (value == null || value === "") {
        throw new Error(`${column.label} is required.`);
      }
    }
  }
  return parsed;
}

function displayValue(value: MasterDataValue): string {
  if (value == null || value === "") {
    return "";
  }
  if (value === true) {
    return "Active";
  }
  if (value === false) {
    return "Inactive";
  }
  if (value === "Y") {
    return "Active";
  }
  if (value === "N") {
    return "Inactive";
  }
  return String(value);
}

export function previewMasterDataWrite(input: {
  entry: MasterDataEntry;
  mode: MasterDataWriteMode;
  current: MasterDataRow | null;
  values: Record<string, unknown>;
}): {
  values: Record<string, MasterDataValue>;
  preview: Array<Record<string, unknown>>;
} {
  if (input.mode === "delete") {
    if (!input.current) {
      throw new Error(`${input.entry.label} was not found.`);
    }
    const preview = input.entry.columns.map((column) => ({
      Field: column.label,
      Value: displayValue(input.current?.[column.name] ?? null),
    }));
    return { values: {}, preview };
  }

  const values = parseMasterDataValues(input.entry, input.values, input.mode);
  if (input.mode === "update" && !input.current) {
    throw new Error(`${input.entry.label} was not found.`);
  }

  const columns = editableMasterDataColumns(input.entry, input.mode);
  const preview: Array<Record<string, unknown>> = [];
  for (const column of columns) {
    if (!Object.prototype.hasOwnProperty.call(values, column.name)) {
      continue;
    }
    const before = input.current?.[column.name] ?? null;
    const after = values[column.name] ?? null;
    if (input.mode === "update" && displayValue(before) === displayValue(after)) {
      continue;
    }
    preview.push({
      Field: column.label,
      Before: displayValue(before),
      After: displayValue(after),
    });
  }
  if (preview.length === 0) {
    throw new Error("No changes to save.");
  }
  return { values, preview };
}
