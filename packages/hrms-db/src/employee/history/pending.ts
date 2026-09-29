import type { HrmsDb } from "../../shared/client";
import { asIso } from "../../shared/iso";
import { compareTimeStampDesc } from "./dates";
import { groupFieldChangesIntoEvents } from "./diff";
import type {
  HistoryChangeEvent,
  HistoryChangeField,
  HistoryChangeType,
  HistoryEditor,
} from "./types";

type PendingDetailRow = {
  ChangeRequestId: number;
  RequestedDateUtc: Date | string | null;
  RequestedDate: Date | string | null;
  CreatedBy: number | null;
  SectionName: string | null;
  FieldName: string | null;
  OldValue: string | null;
  NewValue: string | null;
  TextValueOld: string | null;
  TextValueNew: string | null;
  IsNew: boolean | number | null;
};

function changeType(isNew: unknown): HistoryChangeType {
  if (isNew === true || isNew === 1 || isNew === "1") {
    return "ADDED";
  }
  return "MODIFIED";
}

function displayValue(preferred: string | null, fallback: string | null): string {
  const value = (preferred ?? fallback ?? "").trim();
  return value === "" ? "NOT SET" : value;
}

export async function loadPendingHistory(
  db: HrmsDb,
  input: {
    employerId: number;
    employeeId: number;
    section?: string | null;
    editors: Map<number, HistoryEditor>;
  },
): Promise<HistoryChangeEvent[]> {
  const rows = await db.$queryRaw<PendingDetailRow[]>`
    SELECT
        Header.ChangeRequestId,
        Header.RequestedDateUtc,
        Header.RequestedDate,
        Header.CreatedBy,
        Detail.SectionName,
        Detail.FieldName,
        Detail.OldValue,
        Detail.NewValue,
        Detail.TextValueOld,
        Detail.TextValueNew,
        Detail.IsNew
    FROM dbo.TMyDetailsChangeRequests AS Header
    INNER JOIN dbo.TMyDetailsChangeRequestDetails AS Detail
        ON Detail.ChangeRequestId = Header.ChangeRequestId
    WHERE Header.EmployeeId = ${input.employeeId}
      AND Header.EmployerId = ${input.employerId}
      AND Header.IsApproved IS NULL
    ORDER BY Header.ChangeRequestId DESC, Detail.ChangeDetailsId ASC
  `;

  const filtered = input.section
    ? rows.filter((row) => (row.SectionName ?? "").trim() === input.section)
    : rows;

  // Group by change request + section so multi-section requests still split cleanly.
  const buckets = new Map<
    string,
    {
      timeStamp: string;
      editorEmployeeId: number | null;
      section: string;
      changes: HistoryChangeField[];
    }
  >();

  for (const row of filtered) {
    const section = (row.SectionName ?? "Unknown").trim() || "Unknown";
    const timeStamp =
      asIso(row.RequestedDateUtc) ??
      asIso(row.RequestedDate) ??
      new Date(0).toISOString();
    const key = `${row.ChangeRequestId}|${section}`;
    const field = (row.FieldName ?? "").trim() || "Field";
    const change: HistoryChangeField = {
      field,
      oldValue: displayValue(row.TextValueOld, row.OldValue),
      newValue: displayValue(row.TextValueNew, row.NewValue),
      changeType: changeType(row.IsNew),
    };
    const existing = buckets.get(key);
    if (existing) {
      existing.changes.push(change);
      continue;
    }
    buckets.set(key, {
      timeStamp,
      editorEmployeeId: row.CreatedBy,
      section,
      changes: [change],
    });
  }

  const events: HistoryChangeEvent[] = [];
  for (const bucket of buckets.values()) {
    const [event] = groupFieldChangesIntoEvents(
      bucket.section,
      bucket.changes.map((change) => ({
        timeStamp: bucket.timeStamp,
        editorEmployeeId: bucket.editorEmployeeId,
        change,
      })),
      input.editors,
    );
    if (event) {
      events.push(event);
    }
  }

  events.sort((a, b) => {
    const byTime = compareTimeStampDesc(a.timeStamp, b.timeStamp);
    if (byTime !== 0) {
      return byTime;
    }
    return a.section.localeCompare(b.section);
  });
  return events;
}
