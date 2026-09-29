import type {
  HistoryChangeEvent,
  HistoryChangeField,
  HistoryChangeType,
  HistoryEditor,
  HistorySnapshot,
} from "./types";

const META_KEYS = new Set([
  "entityKey",
  "timeStamp",
  "historyId",
  "editorEmployeeId",
  "isDeleted",
  "effectiveDate",
  "futureTransId",
  "values",
]);

export function normalizeDisplayValue(value: unknown): string {
  if (value == null) {
    return "";
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  if (typeof value === "number") {
    if (Number.isNaN(value)) {
      return "";
    }
    return String(value);
  }
  const text = String(value).trim();
  if (
    text === "" ||
    text.toLowerCase() === "null" ||
    text === "01-01-1900" ||
    text.startsWith("1900-01-01")
  ) {
    return "";
  }
  return text;
}

export function displayOrNotSet(value: string): string {
  return value === "" ? "NOT SET" : value;
}

function inferChangeType(
  oldValue: string,
  newValue: string,
  entityDeleted: boolean,
): HistoryChangeType {
  if (entityDeleted || (oldValue !== "" && newValue === "")) {
    return "REMOVED";
  }
  if (oldValue === "" && newValue !== "") {
    return "ADDED";
  }
  return "MODIFIED";
}

/**
 * Diff consecutive snapshots (oldest → newest) per entity.
 * Emits one field change per changed catalogue column.
 */
export function diffSnapshotSeries(
  snapshots: HistorySnapshot[],
  fieldLabels: Record<string, string>,
  fieldOrder: string[],
): Array<{
  timeStamp: string;
  editorEmployeeId: number | null;
  change: HistoryChangeField;
}> {
  const byEntity = new Map<string, HistorySnapshot[]>();
  for (const snap of snapshots) {
    const list = byEntity.get(snap.entityKey) ?? [];
    list.push(snap);
    byEntity.set(snap.entityKey, list);
  }

  const out: Array<{
    timeStamp: string;
    editorEmployeeId: number | null;
    change: HistoryChangeField;
  }> = [];

  for (const series of byEntity.values()) {
    series.sort((a, b) => {
      if (a.seriesOrder != null && b.seriesOrder != null && a.seriesOrder !== b.seriesOrder) {
        return a.seriesOrder - b.seriesOrder;
      }
      if (a.timeStamp !== b.timeStamp) {
        return a.timeStamp < b.timeStamp ? -1 : 1;
      }
      return a.historyId - b.historyId;
    });

    for (let i = 0; i < series.length; i++) {
      const curr = series[i]!;
      const prev = i === 0 ? null : series[i - 1]!;
      if (curr.emitEvent === false) {
        continue;
      }
      const columns =
        fieldOrder.length > 0
          ? fieldOrder
          : Array.from(
              new Set([
                ...Object.keys(curr.values),
                ...(prev ? Object.keys(prev.values) : []),
              ]),
            ).filter((key) => !META_KEYS.has(key));

      if (curr.isDeleted && (!prev || !prev.isDeleted)) {
        for (const column of columns) {
          const oldValue = normalizeDisplayValue(prev?.values[column] ?? curr.values[column]);
          if (oldValue === "" && normalizeDisplayValue(curr.values[column]) === "") {
            continue;
          }
          out.push({
            timeStamp: curr.timeStamp,
            editorEmployeeId: curr.editorEmployeeId,
            change: {
              field: fieldLabels[column] ?? column,
              oldValue: displayOrNotSet(oldValue),
              newValue: "NOT SET",
              changeType: "REMOVED",
              effectiveDate: curr.effectiveDate,
              futureTransId: curr.futureTransId,
            },
          });
        }
        continue;
      }

      if (curr.isDeleted) {
        continue;
      }

      for (const column of columns) {
        const newValue = normalizeDisplayValue(curr.values[column]);
        const oldValue = normalizeDisplayValue(prev?.values[column]);

        // First snapshot = ADDED in My Details SPs: emit every catalogue field,
        // including empty new values (SP filter: changeType='ADDED' OR Old<>New).
        if (!prev) {
          out.push({
            timeStamp: curr.timeStamp,
            editorEmployeeId: curr.editorEmployeeId,
            change: {
              field: fieldLabels[column] ?? column,
              oldValue: "NOT SET",
              newValue: newValue === "" ? "" : displayOrNotSet(newValue),
              changeType: "ADDED",
              effectiveDate: curr.effectiveDate,
              futureTransId: curr.futureTransId,
            },
          });
          continue;
        }

        if (newValue === oldValue) {
          continue;
        }
        out.push({
          timeStamp: curr.timeStamp,
          editorEmployeeId: curr.editorEmployeeId,
          change: {
            field: fieldLabels[column] ?? column,
            oldValue: displayOrNotSet(oldValue),
            newValue: displayOrNotSet(newValue),
            changeType: inferChangeType(oldValue, newValue, false),
            effectiveDate: curr.effectiveDate,
            futureTransId: curr.futureTransId,
          },
        });
      }
    }
  }

  return out;
}

export function groupFieldChangesIntoEvents(
  section: string,
  rows: Array<{
    timeStamp: string;
    editorEmployeeId: number | null;
    change: HistoryChangeField;
  }>,
  editors: Map<number, HistoryEditor>,
): HistoryChangeEvent[] {
  const buckets = new Map<string, HistoryChangeEvent>();

  for (const row of rows) {
    const editor =
      row.editorEmployeeId != null ? editors.get(row.editorEmployeeId) : undefined;
    const editorName = editor?.name?.trim() || "Unknown";
    const editorId = editor?.employmentNumber?.trim() || "";
    const key = `${row.timeStamp}|${row.editorEmployeeId ?? ""}|${section}`;
    const existing = buckets.get(key);
    if (existing) {
      existing.changes.push(row.change);
      continue;
    }
    buckets.set(key, {
      timeStamp: row.timeStamp,
      editor: { name: editorName, id: editorId },
      section,
      changes: [row.change],
    });
  }

  return Array.from(buckets.values());
}

export function snapshotsToEvents(
  section: string,
  snapshots: HistorySnapshot[],
  fieldLabels: Record<string, string>,
  fieldOrder: string[],
  editors: Map<number, HistoryEditor>,
): HistoryChangeEvent[] {
  const fieldRows = diffSnapshotSeries(snapshots, fieldLabels, fieldOrder);
  return groupFieldChangesIntoEvents(section, fieldRows, editors);
}
