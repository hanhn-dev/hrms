import { isValidElement, type ReactNode } from "react";
import type { ColumnDataIndex } from "@/shared/ui/column-values";

const EDITABLE_ACTIONS_KEY = "editable-actions";
const MAX_UNWRAP_DEPTH = 6;

export type DefaultFilterColumn = {
  dataIndex?: unknown;
  key?: unknown;
  title?: unknown;
  filters?: unknown;
  onFilter?: unknown;
  filterDropdown?: unknown;
  render?: unknown;
};

/** Columns that already filter themselves, and the row-edit actions column, stay as they are. */
export function shouldApplyDefaultFilter(column: DefaultFilterColumn): boolean {
  if (column.filters != null || column.onFilter != null || column.filterDropdown != null) {
    return false;
  }
  if (column.key === EDITABLE_ACTIONS_KEY) {
    return false;
  }
  if (isColumnDataIndex(column.dataIndex)) {
    return true;
  }
  return (
    typeof column.render === "function" &&
    typeof column.title === "string" &&
    column.title.trim() !== ""
  );
}

export type SearchableColumn = DefaultFilterColumn & {
  children?: readonly SearchableColumn[];
  /** When false, the column is skipped by global table search. Default true. */
  tableSearch?: boolean;
};

/** A blank query matches every row. Otherwise any visible cell may match. */
export function rowMatchesTableSearch(
  columns: readonly SearchableColumn[] | undefined,
  record: object,
  query: unknown,
): boolean {
  const needle = query == null ? "" : String(query).trim();
  if (needle === "") {
    return true;
  }
  if (columns == null || columns.length === 0) {
    return false;
  }
  return columns.some((column) => columnMatchesTableSearch(column, record, needle));
}

/**
 * Precompute lowercase searchable text per row so filtering is a single
 * `includes` instead of re-running column renders on every query change.
 */
export function buildRowSearchTexts(
  columns: readonly SearchableColumn[] | undefined,
  rows: readonly object[],
): string[] {
  if (columns == null || columns.length === 0 || rows.length === 0) {
    return rows.map(() => "");
  }
  return rows.map((row) => rowSearchText(columns, row));
}

function rowSearchText(columns: readonly SearchableColumn[], record: object): string {
  const parts: string[] = [];
  for (const column of columns) {
    appendColumnSearchText(column, record, parts);
  }
  return parts.join("\0").toLowerCase();
}

function appendColumnSearchText(
  column: SearchableColumn,
  record: object,
  parts: string[],
): void {
  if (column.tableSearch === false) {
    return;
  }
  if (Array.isArray(column.children)) {
    for (const child of column.children) {
      appendColumnSearchText(child, record, parts);
    }
    return;
  }
  if (column.key === EDITABLE_ACTIONS_KEY) {
    return;
  }
  const text = columnCellText(column, record).trim();
  if (text !== "") {
    parts.push(text);
  }
}

function columnMatchesTableSearch(
  column: SearchableColumn,
  record: object,
  query: string,
): boolean {
  if (column.tableSearch === false) {
    return false;
  }
  if (Array.isArray(column.children)) {
    return column.children.some((child) => columnMatchesTableSearch(child, record, query));
  }
  if (column.key === EDITABLE_ACTIONS_KEY) {
    return false;
  }
  return matchesColumnFilter(columnCellText(column, record), query);
}

/** Case-insensitive contains. A blank query matches every cell. */
export function matchesColumnFilter(text: string, query: unknown): boolean {
  const needle = query == null ? "" : String(query).trim().toLowerCase();
  if (needle === "") {
    return true;
  }
  return text.toLowerCase().includes(needle);
}

/** Text used to filter one cell: rendered string or tag label, otherwise the raw value. */
export function columnCellText(column: DefaultFilterColumn, record: object): string {
  const raw = isColumnDataIndex(column.dataIndex)
    ? readColumnValue(record, column.dataIndex)
    : undefined;
  const rendered =
    typeof column.render === "function"
      ? (column.render as (value: unknown, row: object, index: number) => unknown)(raw, record, 0)
      : raw;
  const renderedText = cellFilterText(rendered);
  if (renderedText.trim() !== "") {
    return renderedText;
  }
  return cellFilterText(raw);
}

function cellFilterText(node: unknown, depth = 0): string {
  if (node == null || typeof node === "boolean") {
    return "";
  }
  if (typeof node === "string" || typeof node === "number" || typeof node === "bigint") {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map((child) => cellFilterText(child, depth)).join("");
  }
  if (!isValidElement(node) || depth > MAX_UNWRAP_DEPTH) {
    return "";
  }
  const element = node as React.ReactElement<{ children?: ReactNode }>;
  const childrenText = cellFilterText(element.props?.children, depth);
  if (childrenText.trim() !== "") {
    return childrenText;
  }
  if (typeof element.type !== "function" || !isHookFree(element.type)) {
    return "";
  }
  try {
    const rendered = (element.type as (props: unknown) => unknown)(element.props);
    return cellFilterText(rendered, depth + 1);
  } catch {
    return "";
  }
}

function isHookFree(type: Function): boolean {
  const source = Function.prototype.toString.call(type);
  return !/\buse[A-Z]/.test(source);
}

function isColumnDataIndex(value: unknown): value is ColumnDataIndex {
  if (typeof value === "string") {
    return value.length > 0;
  }
  if (typeof value === "number") {
    return true;
  }
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((part) => typeof part === "string" || typeof part === "number")
  );
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
