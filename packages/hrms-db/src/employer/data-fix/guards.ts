import { parseEmployerId } from "../../shared/ids.ts";

export const MIN_COLUMN_SEARCH_LENGTH = 2;
export const MAX_COLUMN_HITS = 50;
export const MAX_TABLE_HITS = 50;
export const DATA_FIX_BROWSE_LIMIT = 100;
export const MAX_DATA_FIX_ROWS = 200;
export const DATA_FIX_SAMPLE_ROWS = 50;

const BROWSE_TEXT_TYPES = new Set(["char", "nchar", "varchar", "nvarchar"]);
const BROWSE_NUMBER_TYPES = new Set([
  "tinyint",
  "smallint",
  "int",
  "bigint",
  "decimal",
  "numeric",
  "money",
  "smallmoney",
]);
const BROWSE_DATE_TYPES = new Set(["date", "datetime", "datetime2", "smalldatetime"]);

const STRING_TYPES = new Set(["char", "nchar", "varchar", "nvarchar"]);
const INT_TYPES = new Set(["tinyint", "smallint", "int", "bigint"]);
const DECIMAL_TYPES = new Set(["decimal", "numeric", "money", "smallmoney"]);
const DATE_TYPES = new Set(["date"]);
const DATETIME_TYPES = new Set(["datetime", "datetime2", "smalldatetime"]);

const INT_RANGES: Record<string, { min: number; max: number }> = {
  tinyint: { min: 0, max: 255 },
  smallint: { min: -32768, max: 32767 },
  int: { min: -2147483648, max: 2147483647 },
  bigint: { min: Number.MIN_SAFE_INTEGER, max: Number.MAX_SAFE_INTEGER },
};

export type DataFixColumnHit = {
  schema: string;
  table: string;
  column: string;
  typeName: string;
  nullable: boolean;
  hasEmployerColumn: boolean;
};

export type DataFixTableHit = {
  schema: string;
  table: string;
  hasEmployerColumn: boolean;
};

export type BrowseFilter =
  | { name: string; kind: "text" }
  | { name: string; kind: "number"; value: number }
  | { name: string; kind: "bit"; value: boolean }
  | { name: string; kind: "date" };

export type DataFixBrowseColumn = {
  name: string;
  typeName: string;
  nullable: boolean;
  identity: boolean;
  primaryKey: boolean;
  computed: boolean;
};

export type DataFixCellEdit = {
  keys: Record<string, string | null>;
  column: string;
  previous: string | null;
  next: string | null;
};

export type DataFixBatchRow = {
  keys: Array<{ column: string; value: DataFixLiteral }>;
  sets: Array<{ column: string; previous: DataFixLiteral; next: DataFixLiteral }>;
};

export const MAX_DATA_FIX_CELLS = 200;

export type DataFixColumnFacts = {
  schema: string;
  table: string;
  column: string;
  typeName: string;
  maxLength: number | null;
  nullable: boolean;
  identity: boolean;
  primaryKey: boolean;
  computed: boolean;
  hasEmployerColumn: boolean;
  employerColumn: string | null;
  employeeColumn: string | null;
  keyColumns: string[];
};

export type DataFixLiteral =
  | { kind: "null" }
  | { kind: "string"; value: string }
  | { kind: "int"; value: number }
  | { kind: "decimal"; value: string }
  | { kind: "bit"; value: boolean }
  | { kind: "datetime"; value: string };

export type DataFixPlan = {
  schema: string;
  table: string;
  column: string;
  typeName: string;
  employerColumn: string;
  employerId: number;
  employeeColumn: string | null;
  employeeId: number | null;
  match: DataFixLiteral;
  next: DataFixLiteral;
  keyColumns: string[];
};

export function normalizeColumnQuery(query: string): string | null {
  const trimmed = query.trim();
  if (trimmed.length < MIN_COLUMN_SEARCH_LENGTH) {
    return null;
  }
  return trimmed;
}

export function rankColumnHits(
  query: string,
  hits: readonly DataFixColumnHit[],
): DataFixColumnHit[] {
  const normalized = normalizeColumnQuery(query);
  if (!normalized) {
    return [];
  }
  const needle = normalized.toLowerCase();
  return hits
    .filter((hit) => hit.column.toLowerCase().includes(needle))
    .sort((left, right) => {
      const score = nameRank(left.column, needle) - nameRank(right.column, needle);
      if (score !== 0) {
        return score;
      }
      return (
        left.schema.localeCompare(right.schema) ||
        left.table.localeCompare(right.table) ||
        left.column.localeCompare(right.column)
      );
    })
    .slice(0, MAX_COLUMN_HITS);
}

function nameRank(name: string, needle: string): number {
  const folded = name.toLowerCase();
  if (folded === needle) {
    return 0;
  }
  if (folded.startsWith(needle)) {
    return 1;
  }
  return 2;
}

export function rankTableHits(
  query: string,
  hits: readonly DataFixTableHit[],
): DataFixTableHit[] {
  const normalized = normalizeColumnQuery(query);
  if (!normalized) {
    return [];
  }
  const needle = normalized.toLowerCase();
  return hits
    .filter((hit) => hit.table.toLowerCase().includes(needle))
    .sort((left, right) => {
      const score = nameRank(left.table, needle) - nameRank(right.table, needle);
      if (score !== 0) {
        return score;
      }
      return left.schema.localeCompare(right.schema) || left.table.localeCompare(right.table);
    })
    .slice(0, MAX_TABLE_HITS);
}

export type ColumnFilterInput = {
  column: string;
  value: string;
};

export type ColumnBrowseFilter =
  | { name: string; kind: "text"; text: string }
  | { name: string; kind: "number"; value: number }
  | { name: string; kind: "bit"; value: boolean }
  | { name: string; kind: "date"; text: string };

export type ColumnFilterPlan =
  | { ok: true; filters: ColumnBrowseFilter[] }
  | { ok: false; message: string };

export function browseOrderColumns(
  columns: readonly { name: string; identity: boolean; primaryKey: boolean }[],
): string[] {
  const identity = columns.filter((column) => column.identity).map((column) => column.name);
  if (identity.length > 0) {
    return identity;
  }
  return columns.filter((column) => column.primaryKey).map((column) => column.name);
}

export function planColumnFilters(
  columns: readonly { name: string; typeName: string }[],
  requested: readonly ColumnFilterInput[],
): ColumnFilterPlan {
  const filters: ColumnBrowseFilter[] = [];
  const seen = new Set<string>();
  for (const request of requested) {
    const value = request.value.trim();
    const requestedName = request.column.trim();
    if (requestedName === "" || value === "") {
      continue;
    }
    const column = columns.find((item) => item.name.toLowerCase() === requestedName.toLowerCase());
    if (!column) {
      return { ok: false, message: `Column ${requestedName} was not found.` };
    }
    if (seen.has(column.name.toLowerCase())) {
      return { ok: false, message: `${column.name} is filtered more than once.` };
    }
    seen.add(column.name.toLowerCase());
    const planned = planOneColumnFilter(column, value);
    if (!planned.ok) {
      return planned;
    }
    filters.push(planned.filter);
  }
  return { ok: true, filters };
}

function planOneColumnFilter(
  column: { name: string; typeName: string },
  value: string,
): { ok: true; filter: ColumnBrowseFilter } | { ok: false; message: string } {
  const type = column.typeName.toLowerCase();
  if (BROWSE_TEXT_TYPES.has(type)) {
    return { ok: true, filter: { name: column.name, kind: "text", text: value } };
  }
  if (BROWSE_NUMBER_TYPES.has(type)) {
    const numeric = /^-?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value) ? Number(value) : null;
    if (numeric == null || !Number.isFinite(numeric)) {
      return { ok: false, message: `${column.name} needs a number.` };
    }
    return { ok: true, filter: { name: column.name, kind: "number", value: numeric } };
  }
  if (type === "bit") {
    const bit = parseBrowseBit(value);
    if (bit == null) {
      return { ok: false, message: `${column.name} needs true or false.` };
    }
    return { ok: true, filter: { name: column.name, kind: "bit", value: bit } };
  }
  if (BROWSE_DATE_TYPES.has(type)) {
    if (!looksLikeDate(value)) {
      return { ok: false, message: `${column.name} needs a date like YYYY-MM-DD.` };
    }
    return { ok: true, filter: { name: column.name, kind: "date", text: value } };
  }
  return { ok: false, message: `${column.name} cannot be filtered.` };
}

export function browseFilters(
  columns: readonly { name: string; typeName: string }[],
  raw: string,
): BrowseFilter[] {
  const value = raw.trim();
  if (value === "") {
    return [];
  }
  const numeric = /^-?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value) ? Number(value) : null;
  const bit = parseBrowseBit(value);
  const filters: BrowseFilter[] = [];
  for (const column of columns) {
    const type = column.typeName.toLowerCase();
    if (BROWSE_TEXT_TYPES.has(type)) {
      filters.push({ name: column.name, kind: "text" });
    } else if (numeric != null && Number.isFinite(numeric) && BROWSE_NUMBER_TYPES.has(type)) {
      filters.push({ name: column.name, kind: "number", value: numeric });
    } else if (bit != null && type === "bit") {
      filters.push({ name: column.name, kind: "bit", value: bit });
    } else if (looksLikeDate(value) && BROWSE_DATE_TYPES.has(type)) {
      filters.push({ name: column.name, kind: "date" });
    }
  }
  return filters;
}

function looksLikeDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}/.test(value);
}

export function isBrowseColumnEditable(
  column: DataFixBrowseColumn,
  hasEmployerColumn: boolean,
): boolean {
  if (!hasEmployerColumn) {
    return false;
  }
  if (column.name.toLowerCase() === "employerid") {
    return false;
  }
  if (column.identity || column.primaryKey || column.computed) {
    return false;
  }
  return isWritableDataFixType(column.typeName);
}

export function planDataFixBatch(input: {
  columns: readonly DataFixBrowseColumn[];
  keyColumns: readonly string[];
  hasEmployerColumn: boolean;
  changes: readonly DataFixCellEdit[];
}): DataFixBatchRow[] {
  if (!input.hasEmployerColumn) {
    throw new Error("This table has no Employerid column, so it cannot be updated from Data Fix.");
  }
  if (input.keyColumns.length === 0) {
    throw new Error("This table has no primary key, so rows cannot be updated here.");
  }
  if (input.changes.length === 0) {
    throw new Error("Change at least one cell.");
  }
  if (input.changes.length > MAX_DATA_FIX_CELLS) {
    throw new Error(`Commit at most ${MAX_DATA_FIX_CELLS} cells at once.`);
  }

  const byName = new Map(input.columns.map((column) => [column.name.toLowerCase(), column]));
  const grouped = new Map<string, DataFixBatchRow>();
  for (const change of input.changes) {
    const column = byName.get(change.column.toLowerCase());
    if (!column) {
      throw new Error(`Column ${change.column} was not found.`);
    }
    if (!isBrowseColumnEditable(column, true)) {
      throw new Error(`${column.name} cannot be updated from Data Fix.`);
    }
    const keys = input.keyColumns.map((name) => {
      if (!(name in change.keys)) {
        throw new Error(`Row key ${name} is missing.`);
      }
      const keyColumn = byName.get(name.toLowerCase());
      if (!keyColumn) {
        throw new Error(`Row key ${name} was not found.`);
      }
      return {
        column: keyColumn.name,
        value: literalFromText(keyColumn, change.keys[name] ?? null, `${name} key`),
      };
    });
    const previous = literalFromText(column, change.previous, column.name);
    const next = literalFromText(column, change.next, column.name);
    if (next.kind === "null" && !column.nullable) {
      throw new Error(`${column.name} does not allow NULL.`);
    }
    if (sameLiteral(previous, next)) {
      throw new Error(`${column.name} is already that value.`);
    }
    const groupKey = JSON.stringify(keys);
    const group = grouped.get(groupKey) ?? { keys, sets: [] };
    if (group.sets.some((set) => set.column.toLowerCase() === column.name.toLowerCase())) {
      throw new Error(`${column.name} is edited twice on the same row.`);
    }
    group.sets.push({ column: column.name, previous, next });
    grouped.set(groupKey, group);
  }
  return [...grouped.values()];
}

function literalFromText(
  column: DataFixBrowseColumn,
  raw: string | null,
  label: string,
): DataFixLiteral {
  if (raw == null) {
    return { kind: "null" };
  }
  try {
    return parseDataFixLiteral(column.typeName, raw);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Enter a value.";
    throw new Error(`${label}: ${message}`);
  }
}

function sameLiteral(left: DataFixLiteral, right: DataFixLiteral): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function parseBrowseBit(value: string): boolean | null {
  const folded = value.toLowerCase();
  if (folded === "1" || folded === "true" || folded === "y" || folded === "yes") {
    return true;
  }
  if (folded === "0" || folded === "false" || folded === "n" || folded === "no") {
    return false;
  }
  return null;
}

export function dataFixWriteBlock(facts: DataFixColumnFacts): string | null {
  if (!facts.hasEmployerColumn || !facts.employerColumn) {
    return "This table has no Employerid column, so it cannot be updated from Data Fix.";
  }
  if (facts.column.toLowerCase() === "employerid") {
    return "Employerid cannot be updated from Data Fix.";
  }
  if (facts.identity) {
    return "Identity columns cannot be updated.";
  }
  if (facts.primaryKey) {
    return "Primary key columns cannot be updated.";
  }
  if (facts.computed) {
    return "Computed columns cannot be updated.";
  }
  if (!isWritableDataFixType(facts.typeName)) {
    return `${facts.typeName} columns cannot be updated from Data Fix.`;
  }
  return null;
}

export function isWritableDataFixType(typeName: string): boolean {
  const type = typeName.toLowerCase();
  return (
    STRING_TYPES.has(type) ||
    INT_TYPES.has(type) ||
    DECIMAL_TYPES.has(type) ||
    type === "bit" ||
    DATE_TYPES.has(type) ||
    DATETIME_TYPES.has(type)
  );
}

export function parseDataFixLiteral(typeName: string, raw: string): DataFixLiteral {
  const trimmed = raw.trim();
  if (trimmed === "") {
    throw new Error("Enter a value.");
  }
  const type = typeName.toLowerCase();
  if (STRING_TYPES.has(type)) {
    return { kind: "string", value: trimmed };
  }
  if (INT_TYPES.has(type)) {
    return { kind: "int", value: parseIntLiteral(type, trimmed) };
  }
  if (DECIMAL_TYPES.has(type)) {
    if (!/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(trimmed)) {
      throw new Error("Enter a number.");
    }
    return { kind: "decimal", value: trimmed };
  }
  if (type === "bit") {
    return { kind: "bit", value: parseBitLiteral(trimmed) };
  }
  if (DATE_TYPES.has(type) || DATETIME_TYPES.has(type)) {
    return { kind: "datetime", value: parseDateLiteral(trimmed, type) };
  }
  throw new Error(`${typeName} columns cannot be updated from Data Fix.`);
}

export function planDataFixWrite(input: {
  facts: DataFixColumnFacts;
  employerId: number;
  employeeId: number | null;
  matchNull: boolean;
  matchText: string | null;
  setNull: boolean;
  newText: string | null;
}): DataFixPlan {
  const block = dataFixWriteBlock(input.facts);
  if (block) {
    throw new Error(block);
  }
  const employerColumn = input.facts.employerColumn;
  if (!employerColumn) {
    throw new Error("This table has no Employerid column, so it cannot be updated from Data Fix.");
  }
  const employerId = parseEmployerId(input.employerId);
  const employeeId = input.employeeId;
  if (employeeId != null && !input.facts.employeeColumn) {
    throw new Error("This table has no EmployeeId column.");
  }
  if (employeeId != null && (!Number.isInteger(employeeId) || employeeId <= 0)) {
    throw new Error("Employee was not found for this employer.");
  }

  const match = input.matchNull
    ? ({ kind: "null" } as const)
    : parseRequiredLiteral(input.facts, input.matchText, "Current value is required.");
  const next = input.setNull
    ? ({ kind: "null" } as const)
    : parseRequiredLiteral(input.facts, input.newText, "New value is required.");
  if (next.kind === "null" && !input.facts.nullable) {
    throw new Error("This column does not allow NULL.");
  }
  assertStringLength(input.facts, match);
  assertStringLength(input.facts, next);

  return {
    schema: input.facts.schema,
    table: input.facts.table,
    column: input.facts.column,
    typeName: input.facts.typeName,
    employerColumn,
    employerId,
    employeeColumn: employeeId == null ? null : input.facts.employeeColumn,
    employeeId,
    match,
    next,
    keyColumns: input.facts.keyColumns,
  };
}

function parseRequiredLiteral(
  facts: DataFixColumnFacts,
  raw: string | null,
  emptyMessage: string,
): DataFixLiteral {
  if (raw == null || raw.trim() === "") {
    throw new Error(emptyMessage);
  }
  return parseDataFixLiteral(facts.typeName, raw);
}

function assertStringLength(facts: DataFixColumnFacts, literal: DataFixLiteral): void {
  if (literal.kind !== "string" || facts.maxLength == null) {
    return;
  }
  if (literal.value.length > facts.maxLength) {
    throw new Error(`${facts.column} must be at most ${facts.maxLength} characters.`);
  }
}

function parseIntLiteral(type: string, raw: string): number {
  if (!/^-?(?:0|[1-9]\d*)$/.test(raw)) {
    throw new Error("Enter a whole number.");
  }
  const value = Number(raw);
  const range = INT_RANGES[type];
  if (!Number.isSafeInteger(value) || !range || value < range.min || value > range.max) {
    throw new Error("Enter a whole number.");
  }
  return value;
}

function parseBitLiteral(raw: string): boolean {
  const value = raw.toLowerCase();
  if (value === "1" || value === "true" || value === "y" || value === "yes") {
    return true;
  }
  if (value === "0" || value === "false" || value === "n" || value === "no") {
    return false;
  }
  throw new Error("Enter 1, 0, true, or false.");
}

function parseDateLiteral(raw: string, type: string): string {
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/;
  const dateTime = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})$/;
  const dateMatch = dateOnly.exec(raw);
  if (dateMatch) {
    assertCalendar(
      Number(dateMatch[1]),
      Number(dateMatch[2]),
      Number(dateMatch[3]),
    );
    return `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
  }
  if (DATE_TYPES.has(type)) {
    throw new Error("Enter a date as YYYY-MM-DD.");
  }
  const timeMatch = dateTime.exec(raw);
  if (!timeMatch) {
    throw new Error("Enter a date as YYYY-MM-DD or YYYY-MM-DD HH:mm:ss.");
  }
  assertCalendar(
    Number(timeMatch[1]),
    Number(timeMatch[2]),
    Number(timeMatch[3]),
    Number(timeMatch[4]),
    Number(timeMatch[5]),
    Number(timeMatch[6]),
  );
  return `${timeMatch[1]}-${timeMatch[2]}-${timeMatch[3]}T${timeMatch[4]}:${timeMatch[5]}:${timeMatch[6]}`;
}

function assertCalendar(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
): void {
  if (hour > 23 || minute > 59 || second > 59) {
    throw new Error("Enter a date as YYYY-MM-DD or YYYY-MM-DD HH:mm:ss.");
  }
  const parsed = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new Error("Enter a real date.");
  }
}
