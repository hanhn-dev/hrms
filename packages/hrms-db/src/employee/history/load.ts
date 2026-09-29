import type { HrmsDb } from "../../shared/client";
import { employeeIdSchema, parseEmployerId } from "../../shared/ids";
import { loadHistoryCatalogue } from "./catalogue";
import { compareTimeStampDesc, resolveHistoryDateWindow } from "./dates";
import { loadHistoryEditors } from "./editors";
import { loadFutureHistory } from "./future";
import { gatherBankEditorIds, loadBankHistory } from "./past-bank";
import {
  gatherEmploymentEditorIds,
  loadEmploymentHistory,
} from "./past-employment";
import { loadEmployeeCountryId, loadPastSectionFromSpec } from "./past-generic";
import {
  loadDomainHistory,
  loadSkillHistory,
  loadVisaHistory,
} from "./past-skill-domain";
import { loadPendingHistory } from "./pending";
import { PAST_TABLE_SPECS } from "./registry";
import { HISTORY_SECTIONS, isHistorySectionName } from "./sections";
import { sqlIdent, sqlTable } from "./sql";
import type {
  HistoryChangeEvent,
  HistoryChangeResponse,
  HistoryEditor,
  LoadEmployeeHistoryInput,
} from "./types";

function mergeSortPage(
  events: HistoryChangeEvent[],
  pageNumber: number,
  pageSize: number,
): HistoryChangeResponse {
  const sorted = [...events].sort((a, b) => {
    const byTime = compareTimeStampDesc(a.timeStamp, b.timeStamp);
    if (byTime !== 0) {
      return byTime;
    }
    const bySection = a.section.localeCompare(b.section);
    if (bySection !== 0) {
      return bySection;
    }
    return a.editor.id.localeCompare(b.editor.id);
  });
  const totalItems = sorted.length;
  const start = Math.max(0, (pageNumber - 1) * pageSize);
  return {
    totalItems,
    data: sorted.slice(start, start + pageSize),
  };
}

async function gatherEditorIdsFromTable(
  db: HrmsDb,
  input: {
    table: string;
    employeeIdColumn: string;
    editorColumn: string;
    timestampColumn: string;
    employeeId: number;
    from: Date | null;
    toExclusive: Date | null;
  },
): Promise<number[]> {
  try {
    const tableSql = sqlTable(input.table);
    const empCol = sqlIdent(input.employeeIdColumn);
    const editorCol = sqlIdent(input.editorColumn);
    const tsCol = sqlIdent(input.timestampColumn);
    const rows =
      input.from && input.toExclusive
        ? await db.$queryRaw<Array<{ EditorId: number | null }>>`
            SELECT DISTINCT ${editorCol} AS EditorId
            FROM ${tableSql}
            WHERE ${empCol} = ${input.employeeId}
              AND ${tsCol} >= ${input.from}
              AND ${tsCol} < ${input.toExclusive}
          `
        : await db.$queryRaw<Array<{ EditorId: number | null }>>`
            SELECT DISTINCT ${editorCol} AS EditorId
            FROM ${tableSql}
            WHERE ${empCol} = ${input.employeeId}
          `;
    return rows
      .map((row) => row.EditorId)
      .filter((id): id is number => typeof id === "number" && id > 0);
  } catch {
    return [];
  }
}

async function gatherPastEditorIds(
  db: HrmsDb,
  input: {
    employeeId: number;
    from: Date | null;
    toExclusive: Date | null;
    sectionFilter: string | null;
  },
): Promise<number[]> {
  const want = (name: string) => !input.sectionFilter || input.sectionFilter === name;
  const tasks: Array<Promise<number[]>> = [];

  for (const spec of PAST_TABLE_SPECS) {
    if (!want(spec.sectionName)) {
      continue;
    }
    tasks.push(
      gatherEditorIdsFromTable(db, {
        table: spec.historyTable,
        employeeIdColumn: spec.employeeIdColumn,
        editorColumn: spec.historyEditorColumn,
        timestampColumn: spec.historyTimestampColumn,
        employeeId: input.employeeId,
        from: input.from,
        toExclusive: input.toExclusive,
      }),
    );
  }

  if (want("Skill Details")) {
    tasks.push(
      gatherEditorIdsFromTable(db, {
        table: "TEmployeeskillhistoryDetails",
        employeeIdColumn: "EmployeeId",
        editorColumn: "LastUpdatedBy",
        timestampColumn: "LastModifyOnUtcTime",
        employeeId: input.employeeId,
        from: input.from,
        toExclusive: input.toExclusive,
      }),
    );
  }
  if (want("Domain Details")) {
    tasks.push(
      gatherEditorIdsFromTable(db, {
        table: "TEmpDomainHistoryDetails",
        employeeIdColumn: "EmployeeId",
        editorColumn: "LastModifiedBy",
        timestampColumn: "LastModifyOnUtcTime",
        employeeId: input.employeeId,
        from: input.from,
        toExclusive: input.toExclusive,
      }),
    );
  }
  if (want("Current Employment Details")) {
    tasks.push(gatherEmploymentEditorIds(db, input));
  }
  if (want("Passport Details")) {
    tasks.push(
      gatherEditorIdsFromTable(db, {
        table: "TEmployeeVisaInfoHistory",
        employeeIdColumn: "EmployeeId",
        editorColumn: "UpdatedBy",
        timestampColumn: "UpdatedDateUtcTime",
        employeeId: input.employeeId,
        from: input.from,
        toExclusive: input.toExclusive,
      }),
    );
  }
  if (want("Bank Details")) {
    tasks.push(gatherBankEditorIds(db, input));
  }

  const batches = await Promise.all(tasks);
  return Array.from(new Set(batches.flat()));
}

async function loadPastEvents(
  db: HrmsDb,
  input: {
    employerId: number;
    employeeId: number;
    section?: string | null;
    from: Date | null;
    toExclusive: Date | null;
    editors: Map<number, HistoryEditor>;
  },
): Promise<HistoryChangeEvent[]> {
  const countryId = await loadEmployeeCountryId(db, input.employeeId);
  const sectionFilter =
    input.section && isHistorySectionName(input.section) ? input.section : null;

  const specs = sectionFilter
    ? PAST_TABLE_SPECS.filter((spec) => spec.sectionName === sectionFilter)
    : PAST_TABLE_SPECS;

  const sectionIds = Array.from(
    new Set([
      ...specs.map((spec) => spec.sectionId),
      ...(!sectionFilter || sectionFilter === "Skill Details" ? [2] : []),
      ...(!sectionFilter || sectionFilter === "Domain Details" ? [3] : []),
      ...(!sectionFilter || sectionFilter === "Current Employment Details" ? [14] : []),
    ]),
  );

  const catalogue = await loadHistoryCatalogue(db, {
    employerId: input.employerId,
    countryId,
    sectionIds,
  });

  const loaders: Array<Promise<HistoryChangeEvent[]>> = [];

  for (const spec of specs) {
    loaders.push(
      loadPastSectionFromSpec(db, {
        spec,
        employeeId: input.employeeId,
        from: input.from,
        toExclusive: input.toExclusive,
        catalogueFields: catalogue.get(spec.sectionId) ?? [],
        editors: input.editors,
      }),
    );
  }
  if (!sectionFilter || sectionFilter === "Skill Details") {
    loaders.push(
      loadSkillHistory(db, {
        employeeId: input.employeeId,
        from: input.from,
        toExclusive: input.toExclusive,
        editors: input.editors,
      }),
    );
  }
  if (!sectionFilter || sectionFilter === "Domain Details") {
    loaders.push(
      loadDomainHistory(db, {
        employeeId: input.employeeId,
        from: input.from,
        toExclusive: input.toExclusive,
        editors: input.editors,
      }),
    );
  }
  if (!sectionFilter || sectionFilter === "Current Employment Details") {
    loaders.push(
      loadEmploymentHistory(db, {
        employeeId: input.employeeId,
        from: input.from,
        toExclusive: input.toExclusive,
        editors: input.editors,
      }),
    );
  }
  if (!sectionFilter || sectionFilter === "Passport Details") {
    loaders.push(
      loadVisaHistory(db, {
        employeeId: input.employeeId,
        from: input.from,
        toExclusive: input.toExclusive,
        editors: input.editors,
      }),
    );
  }
  if (!sectionFilter || sectionFilter === "Bank Details") {
    loaders.push(
      loadBankHistory(db, {
        employeeId: input.employeeId,
        from: input.from,
        toExclusive: input.toExclusive,
        editors: input.editors,
      }),
    );
  }

  const batches = await Promise.all(loaders);
  return batches.flat();
}

/**
 * Load employee My Details–style history changes without calling history SPs
 * or building JSON in SQL. Aggregation happens in TypeScript.
 */
export async function loadEmployeeHistoryChanges(
  db: HrmsDb,
  input: LoadEmployeeHistoryInput,
): Promise<HistoryChangeResponse> {
  const employerId = parseEmployerId(input.employerId);
  const employeeId = employeeIdSchema.parse(input.employeeId);
  const pageNumber = Math.max(1, input.pageNumber ?? 1);
  const pageSize = Math.min(100, Math.max(1, input.pageSize ?? 30));
  const section =
    input.section && isHistorySectionName(input.section) ? input.section : null;

  if (input.type === "Pending") {
    const pendingRows = await db.$queryRaw<Array<{ CreatedBy: number | null }>>`
      SELECT DISTINCT CreatedBy
      FROM dbo.TMyDetailsChangeRequests
      WHERE EmployeeId = ${employeeId}
        AND EmployerId = ${employerId}
        AND IsApproved IS NULL
    `;
    const editors = await loadHistoryEditors(
      db,
      pendingRows.map((row) => row.CreatedBy).filter((id): id is number => id != null),
    );
    const events = await loadPendingHistory(db, {
      employerId,
      employeeId,
      section,
      editors,
    });
    return mergeSortPage(events, pageNumber, pageSize);
  }

  if (input.type === "Future") {
    if (section && section !== "Current Employment Details") {
      return { totalItems: 0, data: [] };
    }
    const futureEditors = await db
      .$queryRaw<Array<{ UpdatedBy: number | null }>>`
        SELECT DISTINCT UpdatedBy
        FROM dbo.TEmployeeFutureInfo
        WHERE EmployeeId = ${employeeId}
          AND ISNULL(IsDeleted, 0) = 0
          AND recordstatus = 'I'
      `
      .catch(() => [] as Array<{ UpdatedBy: number | null }>);
    const editors = await loadHistoryEditors(
      db,
      futureEditors.map((row) => row.UpdatedBy).filter((id): id is number => id != null),
    );
    const events = await loadFutureHistory(db, { employeeId, editors });
    const futureOnly = events
      .map((event) => ({
        ...event,
        changes: event.changes.filter((change) => Boolean(change.futureTransId)),
      }))
      .filter((event) => event.changes.length > 0);
    return mergeSortPage(futureOnly, pageNumber, pageSize);
  }

  const window = resolveHistoryDateWindow({
    from: input.from,
    to: input.to,
  });
  const editorIds = await gatherPastEditorIds(db, {
    employeeId,
    from: window.from,
    toExclusive: window.toExclusive,
    sectionFilter: section,
  });
  const editors = await loadHistoryEditors(db, editorIds);
  const events = await loadPastEvents(db, {
    employerId,
    employeeId,
    section,
    from: window.from,
    toExclusive: window.toExclusive,
    editors,
  });
  return mergeSortPage(events, pageNumber, pageSize);
}

export function listHistorySectionOptions(): Array<{ name: string; label: string }> {
  return HISTORY_SECTIONS.map((section) => ({
    name: section.name,
    label: section.label,
  }));
}
