import type { HrmsDb } from "../../shared/client";
import {
  applyOptionMaps,
  catalogueLabels,
  staticOptionMap,
} from "./catalogue";
import { normalizeDisplayValue, snapshotsToEvents } from "./diff";
import {
  applyPersonalLookups,
  loadPersonalLookupMaps,
  loadSectionCustomFieldHistory,
} from "./past-custom-fields";
import type { PastTableSpec } from "./registry";
import {
  asNumber,
  asTimeStampIso,
  isTruthyDeleted,
  rowValue,
  sqlIdent,
  sqlTable,
} from "./sql";
import type {
  CatalogueField,
  HistoryChangeEvent,
  HistoryEditor,
  HistorySnapshot,
} from "./types";

const LIVE_HISTORY_ID = 2_000_000_000;

function skipSet(spec: PastTableSpec): Set<string> {
  return new Set(spec.skipColumns.map((c) => c.toLowerCase()));
}

function pickValues(
  row: Record<string, unknown>,
  order: string[],
  skip: Set<string>,
  optionMaps: Map<string, Map<string, string>>,
  personalLookups?: Map<string, Map<string, string>>,
): Record<string, string> {
  const values: Record<string, string> = {};
  const columns =
    order.length > 0
      ? order
      : Object.keys(row).filter((key) => !skip.has(key.toLowerCase()));

  for (const column of columns) {
    if (skip.has(column.toLowerCase())) {
      continue;
    }
    const raw = rowValue(row, column);
    values[column] = normalizeDisplayValue(raw);
  }
  const withOptions = applyOptionMaps(values, optionMaps);
  if (personalLookups && personalLookups.size > 0) {
    return applyPersonalLookups(withOptions, personalLookups, row);
  }
  return withOptions;
}

function toSnapshot(
  row: Record<string, unknown>,
  spec: PastTableSpec,
  order: string[],
  optionMaps: Map<string, Map<string, string>>,
  isLive: boolean,
  personalLookups?: Map<string, Map<string, string>>,
): HistorySnapshot | null {
  const skip = skipSet(spec);
  const entityKeyRaw = rowValue(row, spec.entityKeyColumn, "EmployeeId", "EmployeeID");
  const entityKey = normalizeDisplayValue(entityKeyRaw);
  if (!entityKey) {
    return null;
  }

  const tsCandidates = isLive
    ? [spec.liveTimestampColumn, "UpdatedDateUtcTime", "ModifiedDateUtc", "CreatedDateUtcTime"]
    : [spec.historyTimestampColumn, "UpdatedDateUtcTime", "ModifiedDateUtc", "CreatedDateUtcTime"];
  let timeStamp: string | null = null;
  for (const col of tsCandidates) {
    timeStamp = asTimeStampIso(rowValue(row, col));
    if (timeStamp) {
      break;
    }
  }
  // Personal SP falls back CreatedDateUtcTime when UpdatedDateUtcTime is null.
  if (!timeStamp && !isLive) {
    timeStamp = asTimeStampIso(rowValue(row, "CreatedDateUtcTime", "CreatedDate"));
  }
  if (!timeStamp) {
    return null;
  }

  const editorCol = isLive ? spec.liveEditorColumn : spec.historyEditorColumn;
  const editorEmployeeId =
    asNumber(rowValue(row, editorCol, "UpdatedBy", "ModifiedBy", "CreatedBy", "LastUpdatedBy")) ??
    null;

  const historyId = isLive
    ? LIVE_HISTORY_ID
    : (asNumber(rowValue(row, spec.historyIdColumn)) ?? 0);

  const deleted = spec.deletedColumn
    ? isTruthyDeleted(rowValue(row, spec.deletedColumn, "IsDelete", "Isdelete", "IsDeleted"))
    : false;

  return {
    entityKey,
    timeStamp,
    historyId,
    seriesOrder: historyId,
    editorEmployeeId,
    isDeleted: deleted,
    values: pickValues(row, order, skip, optionMaps, personalLookups),
  };
}

async function queryTableRows(
  db: HrmsDb,
  table: string,
  employeeIdColumn: string,
  employeeId: number,
  timestampColumn: string | null,
  from: Date | null,
  toExclusive: Date | null,
): Promise<Record<string, unknown>[]> {
  const tableSql = sqlTable(table);
  const empCol = sqlIdent(employeeIdColumn);
  if (timestampColumn && from && toExclusive) {
    const tsCol = sqlIdent(timestampColumn);
    return db.$queryRaw<Record<string, unknown>[]>`
      SELECT *
      FROM ${tableSql}
      WHERE ${empCol} = ${employeeId}
        AND ${tsCol} IS NOT NULL
        AND ${tsCol} >= ${from}
        AND ${tsCol} < ${toExclusive}
    `;
  }
  return db.$queryRaw<Record<string, unknown>[]>`
    SELECT *
    FROM ${tableSql}
    WHERE ${empCol} = ${employeeId}
  `;
}

export async function loadPastSectionFromSpec(
  db: HrmsDb,
  input: {
    spec: PastTableSpec;
    employeeId: number;
    from: Date | null;
    toExclusive: Date | null;
    catalogueFields: CatalogueField[];
    editors: Map<number, HistoryEditor>;
  },
): Promise<HistoryChangeEvent[]> {
  const { labels, order } = catalogueLabels(input.catalogueFields);
  const optionMaps = staticOptionMap(input.catalogueFields);
  const personalLookups =
    input.spec.sectionName === "Personal Details"
      ? await loadPersonalLookupMaps(db)
      : undefined;

  let historyRows: Record<string, unknown>[] = [];
  let liveRows: Record<string, unknown>[] = [];
  try {
    [historyRows, liveRows] = await Promise.all([
      queryTableRows(
        db,
        input.spec.historyTable,
        input.spec.employeeIdColumn,
        input.employeeId,
        input.from && input.toExclusive ? input.spec.historyTimestampColumn : null,
        input.from,
        input.toExclusive,
      ),
      queryTableRows(
        db,
        input.spec.liveTable,
        input.spec.employeeIdColumn,
        input.employeeId,
        null,
        null,
        null,
      ),
    ]);
  } catch {
    // Table/column naming can vary by environment; skip broken section rather than failing all history.
    return [];
  }

  const snapshots: HistorySnapshot[] = [];
  for (const row of historyRows) {
    const snap = toSnapshot(row, input.spec, order, optionMaps, false, personalLookups);
    if (snap) {
      snapshots.push(snap);
    }
  }
  for (const row of liveRows) {
    const snap = toSnapshot(row, input.spec, order, optionMaps, true, personalLookups);
    if (!snap) {
      continue;
    }
    // Live is only a baseline for the newest in-window history row — never emit
    // live-only ADDED noise, and never pull live timestamps from outside the window
    // into the timeline as standalone events.
    const hasHistoryForEntity = snapshots.some((s) => s.entityKey === snap.entityKey);
    if (!hasHistoryForEntity) {
      continue;
    }
    // Attach live as the newest snapshot only when its stamp is at/after the latest history.
    const latestHistory = snapshots
      .filter((s) => s.entityKey === snap.entityKey)
      .sort((a, b) =>
        a.timeStamp === b.timeStamp
          ? b.historyId - a.historyId
          : a.timeStamp < b.timeStamp
            ? 1
            : -1,
      )[0];
    if (
      latestHistory &&
      (snap.timeStamp > latestHistory.timeStamp ||
        (snap.timeStamp === latestHistory.timeStamp && snap.historyId >= latestHistory.historyId))
    ) {
      // Live with null UpdatedDateUtcTime must not emit (My Details filters Modifieddate null).
      snapshots.push({
        ...snap,
        seriesOrder: LIVE_HISTORY_ID,
        emitEvent: Boolean(asTimeStampIso(rowValue(row, input.spec.liveTimestampColumn))),
      });
    }
  }

  const baseEvents = snapshotsToEvents(
    input.spec.sectionName,
    snapshots,
    labels,
    order,
    input.editors,
  );

  if (input.spec.sectionId === 1 || input.spec.sectionName === "Personal Details") {
    const customEvents = await loadSectionCustomFieldHistory(db, {
      employeeId: input.employeeId,
      sectionId: input.spec.sectionId,
      sectionName: input.spec.sectionName,
      from: input.from,
      toExclusive: input.toExclusive,
      editors: input.editors,
    });
    return mergeEventsByStampEditor(baseEvents, customEvents);
  }

  return baseEvents;
}

/** Merge same timestamp+editor+section events (My Details String_agg grouping). */
function mergeEventsByStampEditor(
  ...batches: HistoryChangeEvent[][]
): HistoryChangeEvent[] {
  const map = new Map<string, HistoryChangeEvent>();
  for (const batch of batches) {
    for (const event of batch) {
      const key = `${event.timeStamp}|${event.editor.id}|${event.editor.name}|${event.section}`;
      const existing = map.get(key);
      if (existing) {
        existing.changes.push(...event.changes);
      } else {
        map.set(key, {
          ...event,
          changes: [...event.changes],
        });
      }
    }
  }
  return Array.from(map.values());
}

export async function loadEmployeeCountryId(
  db: HrmsDb,
  employeeId: number,
): Promise<number> {
  const rows = await db.$queryRaw<Array<{ CountryOfEmployment: number | null }>>`
    SELECT CountryOfEmployment
    FROM dbo.TEmployee
    WHERE EmployeeId = ${employeeId}
  `;
  return rows[0]?.CountryOfEmployment ?? 0;
}
