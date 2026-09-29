import type { HrmsDb } from "../../shared/client";
import { normalizeDisplayValue, snapshotsToEvents } from "./diff";
import { asNumber, asTimeStampIso, rowValue } from "./sql";
import type { HistoryChangeEvent, HistoryEditor, HistorySnapshot } from "./types";

const LIVE_ID = 2_000_000_000;

const FUTURE_LABELS: Record<string, string> = {
  EmploymentTypeID: "Employment Type",
  DOJ: "Date of Joining",
  GroupJoiningDate: "Group Joining Date",
  BusinessUnitId: "Business Unit",
  Title: "Designation",
  EmployeeRoleId: "Employee Role",
  WorkLocation: "Work Location",
  LocationId: "Base Location",
  CalendarId: "Calendar",
  ShiftType: "Shift Type",
  AttendanceCaptureType: "Attendance Mode",
  Grade: "Grade",
  GradeBand: "Grade Band",
  ConfirmationDueDate: "Confirmation Due Date",
  ConfirmationDate: "Confirmation Date",
  NoticePeriod: "Notice Period",
  CategoryId: "Skill Category",
  PreviousExperience: "Previous Experience (Months)",
  SameOrgPreExp: "Previous Experience In Current Organization (Months)",
  SameOrgPreEmpNo: "Previous Employment No In Current Organization",
  AssessmentTenure: "Assessment Tenure",
  AssessmentYear: "Upcoming Assessment",
  ReviewManager: "Review Manager",
  ReportsTo: "Reporting Manager",
  FunctionalManager: "Functional Manager",
  Comments: "Comments",
  ESIC: "Health Insurance Number",
  UANNumber: "Universal Account Number",
  PFNumber: "Pension Fund Number",
  EffectiveDate: "Effective Date",
};

const SKIP = new Set(
  [
    "EmployeeId",
    "FutureTransID",
    "FutureTransId",
    "UpdatedBy",
    "UpdatedDate",
    "UpdatedDateUtc",
    "CreatedBy",
    "CreatedDate",
    "IsDeleted",
    "recordstatus",
    "RecordStatus",
    "AutoPresentEffectiveDate",
    "IsAutoPresent",
  ].map((s) => s.toLowerCase()),
);

function toValues(row: Record<string, unknown>): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, value] of Object.entries(row)) {
    if (SKIP.has(key.toLowerCase())) {
      continue;
    }
    values[key] = normalizeDisplayValue(value);
  }
  return values;
}

export async function loadFutureHistory(
  db: HrmsDb,
  input: {
    employeeId: number;
    editors: Map<number, HistoryEditor>;
  },
): Promise<HistoryChangeEvent[]> {
  type Row = Record<string, unknown>;
  let futureRows: Row[] = [];
  let liveRows: Row[] = [];
  try {
    [futureRows, liveRows] = await Promise.all([
      db.$queryRaw<Row[]>`
        SELECT *
        FROM dbo.TEmployeeFutureInfo
        WHERE EmployeeId = ${input.employeeId}
          AND ISNULL(IsDeleted, 0) = 0
          AND recordstatus = 'I'
          AND EffectiveDate > CAST(GETDATE() AS date)
        ORDER BY EffectiveDate ASC, FutureTransID ASC
      `,
      db.$queryRaw<Row[]>`
        SELECT *
        FROM dbo.TEmployeeInfo
        WHERE EmployeeId = ${input.employeeId}
      `,
    ]);
  } catch {
    return [];
  }

  const snapshots: HistorySnapshot[] = [];

  for (const row of liveRows) {
    const timeStamp = asTimeStampIso(
      rowValue(row, "ModifiedDateUtcTime", "UpdatedDateUtcTime", "CreatedDate"),
    );
    if (!timeStamp) {
      continue;
    }
    snapshots.push({
      entityKey: String(input.employeeId),
      timeStamp,
      historyId: 0,
      editorEmployeeId:
        asNumber(rowValue(row, "ModifiedBy", "UpdatedBy", "CreatedBy")) ?? null,
      isDeleted: false,
      values: toValues(row),
    });
  }

  for (const row of futureRows) {
    const effectiveDate = asTimeStampIso(rowValue(row, "EffectiveDate"));
    const futureTransId = normalizeDisplayValue(rowValue(row, "FutureTransID", "FutureTransId"));
    const timeStamp =
      asTimeStampIso(rowValue(row, "UpdatedDateUtc", "UpdatedDate", "EffectiveDate")) ??
      effectiveDate;
    if (!timeStamp) {
      continue;
    }
    snapshots.push({
      entityKey: String(input.employeeId),
      timeStamp,
      historyId: asNumber(rowValue(row, "FutureTransID", "FutureTransId")) ?? LIVE_ID,
      editorEmployeeId:
        asNumber(rowValue(row, "UpdatedBy", "CreatedBy", "ModifiedBy")) ?? null,
      isDeleted: false,
      values: toValues(row),
      effectiveDate: effectiveDate ?? undefined,
      futureTransId: futureTransId || undefined,
    });
  }

  const order = Object.keys(FUTURE_LABELS);
  const labels = { ...FUTURE_LABELS };
  for (const snap of snapshots) {
    for (const key of Object.keys(snap.values)) {
      if (!labels[key]) {
        labels[key] = key;
        order.push(key);
      }
    }
  }

  const events = snapshotsToEvents(
    "Current Employment Details",
    snapshots,
    labels,
    order,
    input.editors,
  );

  // Attach future metadata onto changes that came from future snapshots.
  return events.map((event) => ({
    ...event,
    changes: event.changes.map((change) => {
      const matching = snapshots.find(
        (snap) =>
          snap.timeStamp === event.timeStamp &&
          snap.futureTransId &&
          snap.values[Object.keys(snap.values).find((k) => labels[k] === change.field) ?? ""] !==
            undefined,
      );
      const byTrans = snapshots.find(
        (snap) => snap.timeStamp === event.timeStamp && Boolean(snap.futureTransId),
      );
      return {
        ...change,
        effectiveDate: change.effectiveDate ?? byTrans?.effectiveDate ?? matching?.effectiveDate,
        futureTransId: change.futureTransId ?? byTrans?.futureTransId ?? matching?.futureTransId,
      };
    }),
  }));
}
