import type { SectionFormField } from "./form-fields";
import type { SectionLookupRef, SectionRecordRow } from "./records";

export type PendingSectionStatus = "ADDED" | "UPDATED" | "DELETED";

export type PendingSectionDetail = {
  changeRequestId: number;
  requestedAt: string | null;
  tableName: string | null;
  sectionName: string | null;
  fieldName: string | null;
  dbFieldName: string | null;
  textValueNew: string | null;
  newValue: string | null;
  isNew: boolean;
  childRowId: number | null;
};

export type PendingSectionRow = {
  recordKey: string;
  changeRequestId: number;
  requestedAt: string | null;
  liveTable: string;
  childRowId: number | null;
  status: PendingSectionStatus;
  values: Record<string, string | number | boolean | null>;
  lookups: Record<string, SectionLookupRef>;
};

const DELETE_FIELDS = new Set(["action", "isdelete", "isdeleted"]);
const DELETE_VALUES = new Set(["DELETE", "Y", "1", "TRUE"]);

function normalize(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function pendingCell(detail: PendingSectionDetail): string | null {
  const text = (detail.textValueNew ?? "").trim();
  const raw = (detail.newValue ?? "").trim();
  // Lookup rows store the id in TextValueNew and the label in NewValue.
  if (text && raw && /^\d+$/.test(text) && !/^\d+$/.test(raw)) {
    return raw;
  }
  if (text) return text;
  return raw || null;
}

function isDeletedDetail(detail: PendingSectionDetail): boolean {
  const name = normalize(detail.fieldName);
  const column = normalize(detail.dbFieldName);
  if (!DELETE_FIELDS.has(name) && !DELETE_FIELDS.has(column)) return false;
  const candidates = [detail.newValue, detail.textValueNew]
    .map((value) => (value ?? "").trim().toUpperCase())
    .filter((value) => value !== "");
  return candidates.some((value) => DELETE_VALUES.has(value));
}

function fieldMatchesDetail(
  field: SectionFormField,
  detail: PendingSectionDetail,
): boolean {
  const names = [detail.fieldName, detail.dbFieldName]
    .map(normalize)
    .filter((name) => name !== "");
  if (names.length === 0) return false;
  const candidates = [field.displayText, field.fieldName, field.dbColumn]
    .map(normalize)
    .filter((name) => name !== "");
  return names.some((name) => candidates.includes(name));
}

function matchField(
  fields: SectionFormField[],
  detail: PendingSectionDetail,
): SectionFormField | undefined {
  const matches = fields.filter((field) => fieldMatchesDetail(field, detail));
  const table = normalize(detail.tableName);
  return (
    matches.find((field) => normalize(field.dbTable) === table) ?? matches[0]
  );
}

function canonicalTable(
  tables: readonly string[],
  tableName: string | null,
): string | null {
  const normalized = normalize(tableName);
  if (!normalized) return null;
  return tables.find((table) => table.toLowerCase() === normalized) ?? null;
}

function compareRequestedDesc(
  left: string | null,
  right: string | null,
): number {
  if (left == null && right == null) return 0;
  if (left == null) return 1;
  if (right == null) return -1;
  if (left === right) return 0;
  return left < right ? 1 : -1;
}

/**
 * One pending row per change request, child row, and section table.
 * Delete wins over IsNew, matching the pending-approval item procedure.
 */
export function groupPendingSectionRecords(input: {
  tables: readonly string[];
  fields: SectionFormField[];
  liveRecords: SectionRecordRow[];
  details: PendingSectionDetail[];
}): PendingSectionRow[] {
  if (input.tables.length === 0) return [];

  const buckets = new Map<
    string,
    {
      changeRequestId: number;
      requestedAt: string | null;
      liveTable: string;
      childRowId: number | null;
      details: PendingSectionDetail[];
    }
  >();

  for (const detail of input.details) {
    const liveTable = canonicalTable(input.tables, detail.tableName);
    if (!liveTable) continue;
    const key = `${detail.changeRequestId}|${liveTable.toLowerCase()}|${detail.childRowId ?? ""}`;
    const existing = buckets.get(key);
    if (existing) {
      existing.details.push(detail);
      if (existing.requestedAt == null && detail.requestedAt != null) {
        existing.requestedAt = detail.requestedAt;
      }
      continue;
    }
    buckets.set(key, {
      changeRequestId: detail.changeRequestId,
      requestedAt: detail.requestedAt,
      liveTable,
      childRowId: detail.childRowId,
      details: [detail],
    });
  }

  const rows: PendingSectionRow[] = [];
  for (const bucket of buckets.values()) {
    const deleted = bucket.details.some(isDeletedDetail);
    const added = bucket.details.some((detail) => detail.isNew);
    const status: PendingSectionStatus = deleted
      ? "DELETED"
      : added
        ? "ADDED"
        : "UPDATED";
    const live = input.liveRecords.find(
      (record) =>
        record.liveTable.toLowerCase() === bucket.liveTable.toLowerCase() &&
        record.entityKey === bucket.childRowId,
    );
    const values: Record<string, string | number | boolean | null> =
      status === "ADDED" ? {} : { ...(live?.values ?? {}) };

    if (status !== "DELETED") {
      for (const detail of bucket.details) {
        const field = matchField(input.fields, detail);
        if (!field) continue;
        const cell = pendingCell(detail);
        if (cell == null) continue;
        values[field.displayText] = cell;
      }
    }

    rows.push({
      recordKey: `pending:${bucket.changeRequestId}:${bucket.liveTable}:${bucket.childRowId ?? "new"}`,
      changeRequestId: bucket.changeRequestId,
      requestedAt: bucket.requestedAt,
      liveTable: bucket.liveTable,
      childRowId: bucket.childRowId,
      status,
      values,
      lookups: {},
    });
  }

  rows.sort((left, right) => {
    const byTime = compareRequestedDesc(left.requestedAt, right.requestedAt);
    if (byTime !== 0) return byTime;
    return right.changeRequestId - left.changeRequestId;
  });
  return rows;
}
