import type { HrmsDb } from "../../shared/client";
import { isTimestampInWindow } from "./dates";
import {
  displayOrNotSet,
  groupFieldChangesIntoEvents,
  normalizeDisplayValue,
  snapshotsToEvents,
} from "./diff";
import { asNumber, asTimeStampIso } from "./sql";
import type {
  HistoryChangeEvent,
  HistoryChangeField,
  HistoryEditor,
  HistorySnapshot,
} from "./types";

const LIVE_HISTORY_ID = 2_000_000_000;

const MONTH_NAMES = [
  "",
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

type InfoResolvedRow = {
  HistoryTransID: number;
  EmployeeId: number;
  ModifiedBy: number | null;
  ModifiedDateUtcTime: Date | string | null;
  ModifiedDate: Date | string | null;
  DOJ: Date | string | null;
  GroupJoiningDate: Date | string | null;
  BusinessUnitName: string | null;
  Designation: string | null;
  EmployeeRoleName: string | null;
  WorkLocation: string | null;
  BaseLocation: string | null;
  CalendarName: string | null;
  ShiftTypeName: string | null;
  AttendanceMode: string | null;
  Grade: string | null;
  GradeBand: string | null;
  ConfirmationDueDate: Date | string | null;
  ConfirmationDate: Date | string | null;
  NoticePeriod: string | number | null;
  SkillCategory: string | null;
  PreviousExperience: string | number | null;
  SameOrgPreExp: string | number | null;
  SameOrgPreEmpNo: string | null;
  AssessmentTenure: string | null;
  AssessmentYear: string | number | null;
  AssessmentMonth: string | number | null;
  ReviewManagerName: string | null;
  FunctionalManagerName: string | null;
  Comments: string | null;
  ESIC: string | null;
  UANNumber: string | null;
  PFNumber: string | null;
};

type OrgReportRow = {
  SortOrder: number;
  ReportsToName: string | null;
  ModifiedBy: number | null;
  ModifiedUtcDate: Date | string | null;
};

type EmploymentTypeRow = {
  HistoryTransID: number;
  EmploymentTypeName: string | null;
  ContractEndDate: Date | string | null;
  ModifiedBy: number | null;
  ModifiedUtcDate: Date | string | null;
};

const INFO_FIELD_ORDER = [
  "DOJ",
  "GroupJoiningDate",
  "BusinessUnitName",
  "Designation",
  "EmployeeRoleName",
  "WorkLocation",
  "BaseLocation",
  "CalendarName",
  "ShiftTypeName",
  "AttendanceMode",
  "Grade",
  "GradeBand",
  "ConfirmationDueDate",
  "ConfirmationDate",
  "NoticePeriod",
  "SkillCategory",
  "PreviousExperience",
  "SameOrgPreExp",
  "SameOrgPreEmpNo",
  "AssessmentTenure",
  "UpcomingAssessment",
  "ReviewManagerName",
  "FunctionalManagerName",
  "Comments",
  "ESIC",
  "UANNumber",
  "PFNumber",
] as const;

const INFO_LABELS: Record<string, string> = {
  DOJ: "Date of Joining",
  GroupJoiningDate: "Group Joining Date",
  BusinessUnitName: "Business Unit",
  Designation: "Designation",
  EmployeeRoleName: "Employee Role",
  WorkLocation: "Work Location",
  BaseLocation: "Base Location",
  CalendarName: "Calendar",
  ShiftTypeName: "Shift Type",
  AttendanceMode: "Attendance Mode",
  Grade: "Grade",
  GradeBand: "Grade Band",
  ConfirmationDueDate: "Confirmation Due Date",
  ConfirmationDate: "Confirmation Date",
  NoticePeriod: "Notice Period",
  SkillCategory: "Skill Category",
  PreviousExperience: "Previous Experience (Months)",
  SameOrgPreExp: "Previous Experience In Current Organization (Months)",
  SameOrgPreEmpNo: "Previous Employment No In Current Organization",
  AssessmentTenure: "Assessment Tenure",
  UpcomingAssessment: "Upcoming Assessment",
  ReviewManagerName: "Review Manager",
  FunctionalManagerName: "Functional Manager",
  Comments: "Comments",
  ESIC: "Health Insurance Number",
  UANNumber: "Universal Account Number",
  PFNumber: "Pension Fund Number",
  EmploymentTypeName: "Employment Type",
  ContractEndDate: "End Of Contract",
  ReportsToName: "Reporting Manager",
};

function formatDateDisplay(value: unknown): string {
  if (value == null || value === "") {
    return "";
  }
  const d = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(d.getTime())) {
    return normalizeDisplayValue(value);
  }
  if (d.getUTCFullYear() <= 1900) {
    return "";
  }
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = d.getUTCFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function upcomingAssessment(row: InfoResolvedRow): string {
  const monthRaw = row.AssessmentMonth;
  const year = normalizeDisplayValue(row.AssessmentYear);
  if (monthRaw == null || monthRaw === "" || !year) {
    // My Details often shows month name alone (e.g. "May") when year is stored separately.
    if (monthRaw != null && monthRaw !== "") {
      const monthNum = Number(monthRaw);
      if (Number.isFinite(monthNum) && monthNum >= 1 && monthNum <= 12) {
        return MONTH_NAMES[monthNum] ?? "";
      }
      return normalizeDisplayValue(monthRaw);
    }
    return year;
  }
  const monthNum = Number(monthRaw);
  if (Number.isFinite(monthNum) && monthNum >= 1 && monthNum <= 12) {
    return MONTH_NAMES[monthNum] ?? year;
  }
  return normalizeDisplayValue(monthRaw) || year;
}

function infoValues(row: InfoResolvedRow): Record<string, string> {
  return {
    DOJ: formatDateDisplay(row.DOJ),
    GroupJoiningDate: formatDateDisplay(row.GroupJoiningDate),
    BusinessUnitName: normalizeDisplayValue(row.BusinessUnitName),
    Designation: normalizeDisplayValue(row.Designation),
    EmployeeRoleName: normalizeDisplayValue(row.EmployeeRoleName),
    WorkLocation: normalizeDisplayValue(row.WorkLocation),
    BaseLocation: normalizeDisplayValue(row.BaseLocation),
    CalendarName: normalizeDisplayValue(row.CalendarName),
    ShiftTypeName: normalizeDisplayValue(row.ShiftTypeName),
    AttendanceMode: normalizeDisplayValue(row.AttendanceMode),
    Grade: normalizeDisplayValue(row.Grade),
    GradeBand: normalizeDisplayValue(row.GradeBand),
    ConfirmationDueDate: formatDateDisplay(row.ConfirmationDueDate),
    ConfirmationDate: formatDateDisplay(row.ConfirmationDate),
    NoticePeriod: normalizeDisplayValue(row.NoticePeriod),
    SkillCategory: normalizeDisplayValue(row.SkillCategory),
    PreviousExperience: normalizeDisplayValue(row.PreviousExperience),
    SameOrgPreExp: normalizeDisplayValue(row.SameOrgPreExp),
    SameOrgPreEmpNo: normalizeDisplayValue(row.SameOrgPreEmpNo),
    AssessmentTenure: normalizeDisplayValue(row.AssessmentTenure),
    UpcomingAssessment: upcomingAssessment(row),
    ReviewManagerName: normalizeDisplayValue(row.ReviewManagerName),
    FunctionalManagerName: normalizeDisplayValue(row.FunctionalManagerName),
    Comments: normalizeDisplayValue(row.Comments),
    ESIC: normalizeDisplayValue(row.ESIC),
    UANNumber: normalizeDisplayValue(row.UANNumber),
    PFNumber: normalizeDisplayValue(row.PFNumber),
  };
}

function stampFromInfoUtcOnly(row: InfoResolvedRow): string | null {
  // My Details uses ModifiedDateUtcTime only; null → row filtered from emitted events.
  return asTimeStampIso(row.ModifiedDateUtcTime);
}

function toInfoSnapshot(row: InfoResolvedRow, isLive: boolean): HistorySnapshot {
  const historyId = isLive ? LIVE_HISTORY_ID : Number(row.HistoryTransID);
  const utcStamp = stampFromInfoUtcOnly(row);
  return {
    entityKey: `info:${row.EmployeeId}`,
    // Placeholder stamp for non-emitted baselines (ordering uses seriesOrder).
    timeStamp: utcStamp ?? "1970-01-01T00:00:00.000Z",
    historyId,
    seriesOrder: historyId,
    emitEvent: utcStamp != null,
    editorEmployeeId: asNumber(row.ModifiedBy),
    isDeleted: false,
    values: infoValues(row),
  };
}

/**
 * Current Employment Details — mirrors My Details SP semantics:
 * full TEmployeeInfoHistory + live, TORGChartHistory for Reporting Manager,
 * employment-type history, LEAD-style consecutive diffs, lookup display names.
 */
export async function loadEmploymentHistory(
  db: HrmsDb,
  input: {
    employeeId: number;
    from: Date | null;
    toExclusive: Date | null;
    editors: Map<number, HistoryEditor>;
  },
): Promise<HistoryChangeEvent[]> {
  let crossReporting = "N";
  try {
    const rows = await db.$queryRaw<Array<{ IsCrossReportingApplicable: string | null }>>`
      SELECT TOP 1 ED.IsCrossReportingApplicable
      FROM dbo.TEmployee AS E
      INNER JOIN dbo.TEmployerDetails AS ED ON ED.Employerid = E.EmployerId
      WHERE E.EmployeeId = ${input.employeeId}
    `;
    crossReporting = rows[0]?.IsCrossReportingApplicable === "Y" ? "Y" : "N";
  } catch {
    crossReporting = "N";
  }

  let infoHistory: InfoResolvedRow[] = [];
  let infoLive: InfoResolvedRow[] = [];
  let orgRows: OrgReportRow[] = [];
  let typeHistory: EmploymentTypeRow[] = [];
  let typeLive: EmploymentTypeRow[] = [];

  try {
    [infoHistory, infoLive, orgRows, typeHistory, typeLive] = await Promise.all([
      db.$queryRaw<InfoResolvedRow[]>`
        SELECT
            H.HistoryTransID,
            H.EmployeeId,
            H.ModifiedBy,
            H.ModifiedDateUtcTime,
            H.ModifiedDate,
            H.DOJ,
            H.GroupJoiningDate,
            BU.UnitName AS BusinessUnitName,
            TT.Title AS Designation,
            ER.EmployeeRoleName,
            H.WorkLocation,
            Loc.LocationName AS BaseLocation,
            Cal.CalendarName,
            SM.ShiftName AS ShiftTypeName,
            H.AttendanceCaptureType AS AttendanceMode,
            H.Grade,
            H.GradeBand,
            H.ConfirmationDueDate,
            H.ConfirmationDate,
            H.NoticePeriod,
            CAST(H.CategoryId AS VARCHAR(50)) AS SkillCategory,
            H.PreviousExperience,
            H.SameOrgPreExp,
            H.SameOrgPreEmpNo,
            H.AssessmentTenure,
            H.AssessmentYear,
            H.AssessmentMonth,
            dbo.FN_GetEmployeeOrgName(${crossReporting}, H.ReviewManager) AS ReviewManagerName,
            dbo.FN_GetEmployeeOrgName(${crossReporting}, H.FunctionalManager) AS FunctionalManagerName,
            H.Comments,
            H.ESIC,
            H.UANNumber,
            H.PFNumber
        FROM dbo.TEmployeeInfoHistory AS H
        LEFT JOIN dbo.TOrgHierarchyDetails AS BU
            ON BU.UnitId = H.BusinessUnitId AND BU.Employerid = H.EmployerID
        LEFT JOIN dbo.TEmployeeRoleMaster AS ER
            ON ER.EmployeeRoleId = H.EmployeeRoleId
        LEFT JOIN dbo.TTitle AS TT
            ON TT.ID = H.Title AND TT.Employerid = H.EmployerID
        LEFT JOIN dbo.TLocation AS Loc
            ON Loc.LocationId = H.LocationId
        LEFT JOIN dbo.TCalendarMaster AS Cal
            ON Cal.CalendarId = H.Calendarid AND Cal.EmployerID = H.EmployerID
        LEFT JOIN dbo.TSHIFTMASTER AS SM
            ON SM.ShiftId = H.ShiftType AND SM.EmployerID = H.EmployerID
        WHERE H.EmployeeId = ${input.employeeId}
        ORDER BY H.HistoryTransID ASC
      `,
      db.$queryRaw<InfoResolvedRow[]>`
        SELECT
            CAST(${LIVE_HISTORY_ID} AS INT) AS HistoryTransID,
            H.EmployeeId,
            H.ModifiedBy,
            H.ModifiedDateUtcTime,
            H.ModifiedDate,
            H.DOJ,
            H.GroupJoiningDate,
            BU.UnitName AS BusinessUnitName,
            TT.Title AS Designation,
            ER.EmployeeRoleName,
            H.WorkLocation,
            Loc.LocationName AS BaseLocation,
            Cal.CalendarName,
            SM.ShiftName AS ShiftTypeName,
            H.AttendanceCaptureType AS AttendanceMode,
            H.Grade,
            H.GradeBand,
            H.ConfirmationDueDate,
            H.ConfirmationDate,
            H.NoticePeriod,
            CAST(H.CategoryId AS VARCHAR(50)) AS SkillCategory,
            H.PreviousExperience,
            H.SameOrgPreExp,
            H.SameOrgPreEmpNo,
            H.AssessmentTenure,
            H.AssessmentYear,
            H.AssessmentMonth,
            dbo.FN_GetEmployeeOrgName(${crossReporting}, H.ReviewManager) AS ReviewManagerName,
            dbo.FN_GetEmployeeOrgName(${crossReporting}, H.FunctionalManager) AS FunctionalManagerName,
            H.Comments,
            H.ESIC,
            H.UANNumber,
            H.PFNumber
        FROM dbo.TEmployeeInfo AS H
        LEFT JOIN dbo.TOrgHierarchyDetails AS BU
            ON BU.UnitId = H.BusinessUnitId AND BU.Employerid = H.EmployerID
        LEFT JOIN dbo.TEmployeeRoleMaster AS ER
            ON ER.EmployeeRoleId = H.EmployeeRoleId
        LEFT JOIN dbo.TTitle AS TT
            ON TT.ID = H.Title AND TT.Employerid = H.EmployerID
        LEFT JOIN dbo.TLocation AS Loc
            ON Loc.LocationId = H.LocationId
        LEFT JOIN dbo.TCalendarMaster AS Cal
            ON Cal.CalendarId = H.Calendarid AND Cal.EmployerID = H.EmployerID
        LEFT JOIN dbo.TSHIFTMASTER AS SM
            ON SM.ShiftId = H.ShiftType AND SM.EmployerID = H.EmployerID
        WHERE H.EmployeeId = ${input.employeeId}
      `,
      db.$queryRaw<OrgReportRow[]>`
        SELECT * FROM (
          SELECT
              H.HistoryIdTransid AS SortOrder,
              dbo.FN_GetEmployeeOrgName(${crossReporting}, H.ReportsTo) AS ReportsToName,
              ISNULL(IH.ModifiedBy, H.ModifiedBy) AS ModifiedBy,
              ISNULL(IH.ModifiedDateUtcTime, H.ModifiedUtcDate) AS ModifiedUtcDate
          FROM dbo.TORGChartHistory AS H
          LEFT JOIN dbo.TEmployeeInfoHistory AS IH
              ON IH.HistoryTransID = H.EmployeeHistoryId
          WHERE H.EmployeeId = ${input.employeeId}
          UNION ALL
          SELECT
              CAST(${LIVE_HISTORY_ID} AS INT) AS SortOrder,
              dbo.FN_GetEmployeeOrgName(${crossReporting}, H.ReportsTo) AS ReportsToName,
              ISNULL(I.ModifiedBy, H.ModifiedBy) AS ModifiedBy,
              ISNULL(I.ModifiedDateUtcTime, H.ModifiedUtcDate) AS ModifiedUtcDate
          FROM dbo.TORGChart AS H
          LEFT JOIN dbo.TEmployeeInfo AS I
              ON I.EmployeeId = H.EmployeeId
          WHERE H.EmployeeId = ${input.employeeId}
        ) AS OrgHistory
        ORDER BY SortOrder ASC
      `,
      db.$queryRaw<EmploymentTypeRow[]>`
        SELECT
            H.HistoryTransID,
            T.EmploymentType AS EmploymentTypeName,
            H.ContractEndDate,
            H.ModifiedBy,
            H.ModifiedUtcDate
        FROM dbo.TEmployeeEmploymentTypeHistory AS H
        LEFT JOIN dbo.TMEmploymentTypes AS T
            ON T.EmploymentTypeID = H.EmploymentTypeID
        WHERE H.EmployeeId = ${input.employeeId}
        ORDER BY H.HistoryTransID ASC
      `,
      db.$queryRaw<EmploymentTypeRow[]>`
        SELECT
            CAST(${LIVE_HISTORY_ID} AS INT) AS HistoryTransID,
            T.EmploymentType AS EmploymentTypeName,
            H.ContractEndDate,
            H.ModifiedBy,
            H.ModifiedUtcDate
        FROM dbo.TEmployeeEmploymentType AS H
        LEFT JOIN dbo.TMEmploymentTypes AS T
            ON T.EmploymentTypeID = H.EmploymentTypeID
        WHERE H.EmployeeId = ${input.employeeId}
      `,
    ]);
  } catch {
    return [];
  }

  const infoSnapshots: HistorySnapshot[] = [];
  for (const row of infoHistory) {
    infoSnapshots.push(toInfoSnapshot(row, false));
  }
  for (const row of infoLive) {
    // Always keep live as the newest LEAD baseline (HistoryTransID = LIVE), even when
    // ModifiedDateUtcTime is null — My Details includes it in LEAD but does not emit it.
    infoSnapshots.push(toInfoSnapshot(row, true));
  }

  const reportFieldRows: Array<{
    timeStamp: string;
    editorEmployeeId: number | null;
    change: HistoryChangeField;
  }> = [];
  const orgSorted = [...orgRows].sort((a, b) => Number(a.SortOrder) - Number(b.SortOrder));
  for (let i = 0; i < orgSorted.length; i++) {
    const curr = orgSorted[i]!;
    const prev = i === 0 ? null : orgSorted[i - 1]!;
    const timeStamp = asTimeStampIso(curr.ModifiedUtcDate);
    if (!timeStamp) {
      continue;
    }
    const newValue = normalizeDisplayValue(curr.ReportsToName);
    const oldValue = prev ? normalizeDisplayValue(prev.ReportsToName) : "";
    if (newValue === oldValue) {
      continue;
    }
    if (!prev && newValue === "") {
      continue;
    }
    reportFieldRows.push({
      timeStamp,
      editorEmployeeId: asNumber(curr.ModifiedBy),
      change: {
        field: INFO_LABELS.ReportsToName ?? "Reports To",
        oldValue: displayOrNotSet(oldValue),
        newValue: displayOrNotSet(newValue),
        changeType: !prev || oldValue === "" ? "ADDED" : newValue === "" ? "REMOVED" : "MODIFIED",
      },
    });
  }

  const typeSnapshots: HistorySnapshot[] = [];
  for (const row of [...typeHistory, ...typeLive]) {
    const timeStamp = asTimeStampIso(row.ModifiedUtcDate);
    const historyId = Number(row.HistoryTransID);
    typeSnapshots.push({
      entityKey: `employment-type:${input.employeeId}`,
      timeStamp: timeStamp ?? "1970-01-01T00:00:00.000Z",
      historyId,
      seriesOrder: historyId,
      emitEvent: timeStamp != null,
      editorEmployeeId: asNumber(row.ModifiedBy),
      isDeleted: false,
      values: {
        EmploymentTypeName: normalizeDisplayValue(row.EmploymentTypeName),
        ContractEndDate: formatDateDisplay(row.ContractEndDate),
      },
    });
  }

  const infoEvents = snapshotsToEvents(
    "Current Employment Details",
    infoSnapshots,
    INFO_LABELS,
    [...INFO_FIELD_ORDER],
    input.editors,
  );
  const typeEvents = snapshotsToEvents(
    "Current Employment Details",
    typeSnapshots,
    INFO_LABELS,
    ["EmploymentTypeName", "ContractEndDate"],
    input.editors,
  );
  const reportEvents = groupFieldChangesIntoEvents(
    "Current Employment Details",
    reportFieldRows,
    input.editors,
  );

  return [...infoEvents, ...typeEvents, ...reportEvents].filter((event) =>
    isTimestampInWindow(event.timeStamp, input.from, input.toExclusive),
  );
}

export async function gatherEmploymentEditorIds(
  db: HrmsDb,
  input: { employeeId: number; from: Date | null; toExclusive: Date | null },
): Promise<number[]> {
  void input.from;
  void input.toExclusive;
  try {
    const [info, org, types] = await Promise.all([
      db.$queryRaw<Array<{ ModifiedBy: number | null }>>`
        SELECT DISTINCT ModifiedBy
        FROM dbo.TEmployeeInfoHistory
        WHERE EmployeeId = ${input.employeeId}
      `,
      db.$queryRaw<Array<{ ModifiedBy: number | null }>>`
        SELECT DISTINCT ModifiedBy
        FROM dbo.TORGChartHistory
        WHERE EmployeeId = ${input.employeeId}
      `,
      db.$queryRaw<Array<{ ModifiedBy: number | null }>>`
        SELECT DISTINCT ModifiedBy
        FROM dbo.TEmployeeEmploymentTypeHistory
        WHERE EmployeeId = ${input.employeeId}
      `,
    ]);
    return Array.from(
      new Set(
        [...info, ...org, ...types]
          .map((row) => row.ModifiedBy)
          .filter((id): id is number => typeof id === "number" && id > 0),
      ),
    );
  } catch {
    return [];
  }
}
