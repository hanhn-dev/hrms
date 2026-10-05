import { Prisma } from "../../generated/prisma/client";
import type { HrmsDb } from "../../shared/client";
import { parseEmployerId } from "../../shared/ids";
import { asIso } from "../../shared/iso";
import { activityLabel, activityTypeIdsForText } from "./activity-label";
import { ELMAH_LIST_COLUMNS, extractElmahStack, shortExceptionType } from "./elmah";
import { readablePageName } from "./page-name";
import { parseWindowsTimeZoneOffset, type TimeZoneOffset } from "./timezone";
import { clampLogWindow, LOG_PAGE_SIZE, type LogWindow } from "./window";

export type LogListFilters = {
  from: Date;
  to: Date;
  serverFrom?: Date;
  serverTo?: Date;
  person?: string | null;
  text?: string | null;
  page?: number | null;
};

export type LogEmployerContext = {
  customerNumber: string | null;
  timeZone: string | null;
  offset: TimeZoneOffset | null;
  loginAuditEnabled: boolean;
};

export type ActivityLogRow = {
  logId: number;
  loggedDate: string | null;
  employeeId: number;
  userName: string | null;
  employmentNumber: string | null;
  userRole: string | null;
  activityTypeId: number | null;
  label: string;
  place: string | null;
  comments: string | null;
  ipAddress: string | null;
  browser: string | null;
  hostName: string | null;
};

export type ActivityLogList = {
  rows: ActivityLogRow[];
  totalCount: number;
  page: number;
  pageSize: number;
};

export type PageSessionRow = {
  sessionId: string;
  userName: string | null;
  firstAccess: string | null;
  lastAccess: string | null;
  pageCount: number;
};

export type PageSessionList = {
  rows: PageSessionRow[];
  totalCount: number;
  page: number;
  pageSize: number;
};

export type PageHitRow = {
  id: number;
  sessionId: string;
  pageName: string;
  readablePage: string;
  userName: string | null;
  accessTime: string | null;
};

export type ElmahLogRow = {
  errorId: string;
  sequence: number;
  type: string;
  shortType: string;
  message: string;
  userName: string;
  statusCode: number;
  timeUtc: string | null;
};

export type HandledErrorRow = {
  errorId: number;
  message: string | null;
  stackTrace: string | null;
  occurredOn: string | null;
  userName: string | null;
};

export type ExceptionLogList = {
  elmah: ElmahLogRow[];
  handled: HandledErrorRow[];
  elmahTotal: number;
  handledTotal: number;
  page: number;
  pageSize: number;
};

export type LoginStepRow = {
  id: number;
  userName: string;
  step: string;
  accessTime: string | null;
};

export type LoginStepList = {
  rows: LoginStepRow[];
  totalCount: number;
  page: number;
  pageSize: number;
};

export type MyDetailsExecutionLogRow = {
  logId: number;
  createdDate: string | null;
  logType: string;
  procedureName: string;
  sectionId: string | null;
  sectionName: string | null;
  employeeId: number | null;
  userName: string | null;
  employmentNumber: string | null;
  recordIndex: number | null;
  loginId: number | null;
  calledByLogin: string | null;
  errorNumber: number | null;
  errorSeverity: number | null;
  errorState: number | null;
  errorProcedure: string | null;
  errorLine: number | null;
  errorMessage: string | null;
  parameters: string | null;
  dynamicSql: string | null;
  additionalInfo: string | null;
};

export type MyDetailsExecutionLogList = {
  rows: MyDetailsExecutionLogRow[];
  totalCount: number;
  page: number;
  pageSize: number;
};

type Counted = { TotalCount: number | bigint | null };

function pageOf(value: number | null | undefined): number {
  if (value == null || !Number.isInteger(value) || value < 1) {
    return 1;
  }
  return Math.min(value, 10_000);
}

function textOf(value: string | null | undefined, maxLength: number): string | null {
  const trimmed = value?.trim() ?? "";
  if (trimmed.length < 2 || trimmed.length > maxLength) {
    return null;
  }
  return trimmed;
}

function likePattern(value: string): string {
  return `%${value.replace(/[[%_\]]/g, "[$&]")}%`;
}

function countOf(value: number | bigint | null | undefined): number {
  return Number(value ?? 0);
}

function blankToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed === "" ? null : trimmed;
}

const DETAIL_LIMIT = 12_000;

function clipDetail(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  if (trimmed === "") {
    return null;
  }
  if (trimmed.length <= DETAIL_LIMIT) {
    return trimmed;
  }
  return `${trimmed.slice(0, DETAIL_LIMIT)}\n…`;
}

function asInt(value: number | bigint | null | undefined): number | null {
  if (value == null) {
    return null;
  }
  return Number(value);
}

function range(column: Prisma.Sql, window: LogWindow): Prisma.Sql {
  return Prisma.sql`${column} >= ${window.from} AND ${column} < ${window.to}`;
}

function likeAny(pattern: string, columns: Prisma.Sql[]): Prisma.Sql {
  return Prisma.sql`AND (${Prisma.join(
    columns.map((column) => Prisma.sql`${column} LIKE ${pattern}`),
    " OR ",
  )})`;
}

export async function getLogEmployerContext(
  db: HrmsDb,
  employerIdInput: number,
): Promise<LogEmployerContext | null> {
  const employerId = parseEmployerId(employerIdInput);
  const rows = await db.$queryRaw<
    Array<{
      CustomerNumber: string | null;
      TimeZone: string | null;
      EnableInsertLoginAuditTrail: boolean | number | null;
    }>
  >`
    SELECT
      Employer.custid AS CustomerNumber,
      Employer.TimeZone,
      Employer.EnableInsertLoginAuditTrail
    FROM dbo.TEmployerDetails AS Employer
    WHERE Employer.Employerid = ${employerId}
  `;
  const row = rows[0];
  if (!row) {
    return null;
  }
  const flag = row.EnableInsertLoginAuditTrail;
  return {
    customerNumber: blankToNull(row.CustomerNumber),
    timeZone: blankToNull(row.TimeZone),
    offset: parseWindowsTimeZoneOffset(row.TimeZone),
    loginAuditEnabled: flag === true || flag === 1,
  };
}

export async function listActivityLogs(
  db: HrmsDb,
  employerIdInput: number,
  filters: LogListFilters,
): Promise<ActivityLogList> {
  const employerId = parseEmployerId(employerIdInput);
  const window = clampLogWindow(filters.from, filters.to);
  const page = pageOf(filters.page);
  const offset = (page - 1) * LOG_PAGE_SIZE;
  const person = textOf(filters.person, 100);
  const text = textOf(filters.text, 100);
  const personSql = person
    ? likeAny(likePattern(person), [
        Prisma.sql`Info.EmploymentNumber`,
        Prisma.sql`Log.UserName`,
      ])
    : Prisma.empty;
  const textSql = activityTextSql(text);

  const rows = await db.$queryRaw<
    Array<
      Counted & {
        LogId: number | bigint;
        LoggedDate: Date | null;
        EmployeeId: number | bigint | null;
        UserName: string | null;
        EmploymentNumber: string | null;
        UserRole: string | null;
        ActivityTypeId: number | bigint | null;
        Description: string | null;
        Module: string | null;
        Menu: string | null;
        SubMenu: string | null;
        Comments: string | null;
        IPAddress: string | null;
        Browser: string | null;
        HostName: string | null;
      }
    >
  >`
    SELECT
      Log.LogId,
      Log.LoggedDate,
      Log.EmployeeId,
      Log.UserName,
      Info.EmploymentNumber,
      Log.UserRole,
      Log.ActivityTypeId,
      Types.Description,
      Types.Module,
      Types.Menu,
      Types.SubMenu,
      Log.Comments,
      Log.IPAddress,
      Log.Browser,
      Log.HostName,
      COUNT(*) OVER() AS TotalCount
    FROM dbo.TActivityLog AS Log
    INNER JOIN dbo.TEmployee AS Employee
      ON Employee.EmployeeId = Log.EmployeeId
     AND Employee.Employerid = ${employerId}
    LEFT JOIN dbo.TEmployeeInfo AS Info
      ON Info.EmployeeId = Employee.EmployeeId
    LEFT JOIN dbo.TActivityLogTypes AS Types
      ON Types.ActivityTypeId = Log.ActivityTypeId
    WHERE ${range(Prisma.sql`Log.LoggedDate`, window)}
      ${personSql}
      ${textSql}
    ORDER BY Log.LoggedDate DESC, Log.LogId DESC
    OFFSET ${offset} ROWS FETCH NEXT ${LOG_PAGE_SIZE} ROWS ONLY
  `;

  return {
    rows: rows.map((row) => {
      const activityTypeId =
        row.ActivityTypeId == null ? null : Number(row.ActivityTypeId);
      const place = [row.Module, row.Menu, row.SubMenu]
        .map((part) => part?.trim() ?? "")
        .filter((part) => part !== "")
        .join(" / ");
      return {
        logId: Number(row.LogId),
        loggedDate: asIso(row.LoggedDate),
        employeeId: Number(row.EmployeeId ?? 0),
        userName: blankToNull(row.UserName),
        employmentNumber: blankToNull(row.EmploymentNumber),
        userRole: blankToNull(row.UserRole),
        activityTypeId,
        label: activityLabel({
          activityTypeId,
          description: row.Description,
        }),
        place: place === "" ? null : place,
        comments: blankToNull(row.Comments),
        ipAddress: blankToNull(row.IPAddress),
        browser: blankToNull(row.Browser),
        hostName: blankToNull(row.HostName),
      };
    }),
    totalCount: countOf(rows[0]?.TotalCount),
    page,
    pageSize: LOG_PAGE_SIZE,
  };
}

function activityTextSql(text: string | null): Prisma.Sql {
  if (!text) {
    return Prisma.empty;
  }
  const pattern = likePattern(text);
  const ids = activityTypeIdsForText(text);
  const idClause =
    ids.length > 0
      ? Prisma.sql`OR Log.ActivityTypeId IN (${Prisma.join(ids)})`
      : Prisma.empty;
  return Prisma.sql`
    AND (
      Log.UserName LIKE ${pattern}
      OR Log.Comments LIKE ${pattern}
      OR Types.Description LIKE ${pattern}
      OR Types.Module LIKE ${pattern}
      OR Types.Menu LIKE ${pattern}
      OR Types.SubMenu LIKE ${pattern}
      ${idClause}
    )
  `;
}

export async function listPageSessions(
  db: HrmsDb,
  employerIdInput: number,
  filters: LogListFilters,
): Promise<PageSessionList> {
  const employerId = parseEmployerId(employerIdInput);
  const window = clampLogWindow(filters.from, filters.to);
  const page = pageOf(filters.page);
  const offset = (page - 1) * LOG_PAGE_SIZE;
  const person = textOf(filters.person, 100);
  const text = textOf(filters.text, 100);
  const personSql = person
    ? likeAny(likePattern(person), [Prisma.sql`Trail.UserName`])
    : Prisma.empty;
  const textSql = text
    ? likeAny(likePattern(text), [
        Prisma.sql`Trail.PageName`,
        Prisma.sql`Trail.UserName`,
      ])
    : Prisma.empty;

  const rows = await db.$queryRaw<
    Array<
      Counted & {
        SessionID: string;
        UserName: string | null;
        FirstAccess: Date | null;
        LastAccess: Date | null;
        PageCount: number | bigint;
      }
    >
  >`
    SELECT
      Trail.SessionID,
      MAX(Trail.UserName) AS UserName,
      MIN(Trail.AccessTime) AS FirstAccess,
      MAX(Trail.AccessTime) AS LastAccess,
      COUNT(*) AS PageCount,
      COUNT(*) OVER() AS TotalCount
    FROM dbo.TAuditTrail AS Trail
    WHERE Trail.Employerid = ${employerId}
      AND ${range(Prisma.sql`Trail.AccessTime`, window)}
      ${personSql}
      ${textSql}
    GROUP BY Trail.SessionID
    ORDER BY MAX(Trail.AccessTime) DESC
    OFFSET ${offset} ROWS FETCH NEXT ${LOG_PAGE_SIZE} ROWS ONLY
  `;

  return {
    rows: rows.map((row) => ({
      sessionId: row.SessionID,
      userName: blankToNull(row.UserName),
      firstAccess: asIso(row.FirstAccess),
      lastAccess: asIso(row.LastAccess),
      pageCount: Number(row.PageCount),
    })),
    totalCount: countOf(rows[0]?.TotalCount),
    page,
    pageSize: LOG_PAGE_SIZE,
  };
}

export async function listSessionPages(
  db: HrmsDb,
  employerIdInput: number,
  filters: LogListFilters & { sessionId: string },
): Promise<PageHitRow[]> {
  const employerId = parseEmployerId(employerIdInput);
  const window = clampLogWindow(filters.from, filters.to);
  const sessionId = textOf(filters.sessionId, 50);
  if (!sessionId) {
    return [];
  }
  const rows = await db.$queryRaw<
    Array<{
      Id: number | bigint;
      SessionID: string;
      PageName: string | null;
      UserName: string | null;
      AccessTime: Date | null;
    }>
  >`
    SELECT
      Trail.Id,
      Trail.SessionID,
      Trail.PageName,
      Trail.UserName,
      Trail.AccessTime
    FROM dbo.TAuditTrail AS Trail
    WHERE Trail.Employerid = ${employerId}
      AND Trail.SessionID = ${sessionId}
      AND ${range(Prisma.sql`Trail.AccessTime`, window)}
    ORDER BY Trail.AccessTime ASC, Trail.Id ASC
  `;
  return rows.map((row) => {
    const pageName = row.PageName?.trim() ?? "";
    return {
      id: Number(row.Id),
      sessionId: row.SessionID,
      pageName,
      readablePage: readablePageName(pageName),
      userName: blankToNull(row.UserName),
      accessTime: asIso(row.AccessTime),
    };
  });
}

export async function listExceptionLogs(
  db: HrmsDb,
  employerIdInput: number,
  filters: LogListFilters,
): Promise<ExceptionLogList> {
  const employerId = parseEmployerId(employerIdInput);
  const utcWindow = clampLogWindow(filters.from, filters.to);
  const serverWindow = clampLogWindow(
    filters.serverFrom ?? filters.from,
    filters.serverTo ?? filters.to,
  );
  const page = pageOf(filters.page);
  const offset = (page - 1) * LOG_PAGE_SIZE;
  const person = textOf(filters.person, 100);
  const text = textOf(filters.text, 100);
  const personSql = person
    ? likeAny(likePattern(person), [Prisma.sql`Error.[User]`])
    : Prisma.empty;
  const elmahText = text
    ? likeAny(likePattern(text), [Prisma.sql`Error.Message`, Prisma.sql`Error.Type`])
    : Prisma.empty;
  const handledText = text
    ? likeAny(likePattern(text), [
        Prisma.sql`Error.ErrorMessage`,
        Prisma.sql`Error.Stacktrace`,
      ])
    : Prisma.empty;

  const elmah = await db.$queryRaw<
    Array<
      Counted & {
        ErrorId: string;
        Sequence: number | bigint;
        Type: string | null;
        Message: string | null;
        UserName: string | null;
        StatusCode: number | bigint | null;
        TimeUtc: Date | null;
      }
    >
  >`
    SELECT
      ${Prisma.raw(ELMAH_LIST_COLUMNS)},
      COUNT(*) OVER() AS TotalCount
    FROM dbo.ELMAH_Error AS Error
    WHERE ${range(Prisma.sql`Error.TimeUtc`, utcWindow)}
      AND EXISTS (
        SELECT 1
        FROM dbo.TEmployeeInfo AS Info
        INNER JOIN dbo.TEmployee AS Employee
          ON Employee.EmployeeId = Info.EmployeeId
        WHERE Employee.Employerid = ${employerId}
          AND LTRIM(RTRIM(Info.EmploymentNumber)) = LTRIM(RTRIM(Error.[User]))
      )
      ${personSql}
      ${elmahText}
    ORDER BY Error.TimeUtc DESC, Error.Sequence DESC
    OFFSET ${offset} ROWS FETCH NEXT ${LOG_PAGE_SIZE} ROWS ONLY
  `;

  const handled = await db.$queryRaw<
    Array<
      Counted & {
        ErrorID: number | bigint;
        ErrorMessage: string | null;
        Stacktrace: string | null;
        OccuredOn: Date | null;
        UserName: string | null;
      }
    >
  >`
    SELECT
      Error.ErrorID,
      Error.ErrorMessage,
      Error.Stacktrace,
      Error.OccuredOn,
      Error.UserName,
      COUNT(*) OVER() AS TotalCount
    FROM dbo.TErrorLog AS Error
    WHERE ${range(Prisma.sql`Error.OccuredOn`, serverWindow)}
      ${handledText}
    ORDER BY Error.ErrorID DESC
    OFFSET ${offset} ROWS FETCH NEXT ${LOG_PAGE_SIZE} ROWS ONLY
  `;

  return {
    elmah: elmah.map((row) => ({
      errorId: String(row.ErrorId),
      sequence: Number(row.Sequence),
      type: row.Type?.trim() || "Exception",
      shortType: shortExceptionType(row.Type),
      message: row.Message?.trim() || "",
      userName: row.UserName?.trim() || "",
      statusCode: Number(row.StatusCode ?? 0),
      timeUtc: asIso(row.TimeUtc),
    })),
    handled: handled.map((row) => ({
      errorId: Number(row.ErrorID),
      message: blankToNull(row.ErrorMessage),
      stackTrace: blankToNull(row.Stacktrace),
      occurredOn: asIso(row.OccuredOn),
      userName: blankToNull(row.UserName),
    })),
    elmahTotal: countOf(elmah[0]?.TotalCount),
    handledTotal: countOf(handled[0]?.TotalCount),
    page,
    pageSize: LOG_PAGE_SIZE,
  };
}

export async function getElmahStack(
  db: HrmsDb,
  employerIdInput: number,
  errorId: string,
): Promise<string | null> {
  const employerId = parseEmployerId(employerIdInput);
  if (!/^[0-9a-fA-F-]{36}$/.test(errorId)) {
    return null;
  }
  const rows = await db.$queryRaw<Array<{ AllXml: string | null }>>`
    SELECT Error.AllXml
    FROM dbo.ELMAH_Error AS Error
    WHERE Error.ErrorId = CAST(${errorId} AS uniqueidentifier)
      AND EXISTS (
        SELECT 1
        FROM dbo.TEmployeeInfo AS Info
        INNER JOIN dbo.TEmployee AS Employee
          ON Employee.EmployeeId = Info.EmployeeId
        WHERE Employee.Employerid = ${employerId}
          AND LTRIM(RTRIM(Info.EmploymentNumber)) = LTRIM(RTRIM(Error.[User]))
      )
  `;
  const xml = rows[0]?.AllXml;
  if (xml == null) {
    return null;
  }
  return extractElmahStack(xml);
}

export async function listLoginSteps(
  db: HrmsDb,
  employerIdInput: number,
  filters: LogListFilters,
): Promise<LoginStepList> {
  const employerId = parseEmployerId(employerIdInput);
  const window = clampLogWindow(
    filters.serverFrom ?? filters.from,
    filters.serverTo ?? filters.to,
  );
  const page = pageOf(filters.page);
  const offset = (page - 1) * LOG_PAGE_SIZE;
  const person = textOf(filters.person, 100);
  const text = textOf(filters.text, 100);
  const personSql = person
    ? likeAny(likePattern(person), [Prisma.sql`Trail.UserName`])
    : Prisma.empty;
  const textSql = text
    ? likeAny(likePattern(text), [Prisma.sql`Trail.Transactioninfo`])
    : Prisma.empty;

  const rows = await db.$queryRaw<
    Array<
      Counted & {
        Id: number | bigint;
        UserName: string | null;
        Transactioninfo: string | null;
        AccessTime: Date | null;
      }
    >
  >`
    SELECT
      Trail.Id,
      Trail.UserName,
      Trail.Transactioninfo,
      Trail.AccessTime,
      COUNT(*) OVER() AS TotalCount
    FROM dbo.TLoginAuditTrail AS Trail
    INNER JOIN dbo.TEmployerDetails AS Employer
      ON Employer.Employerid = ${employerId}
     AND LTRIM(RTRIM(Employer.custid)) = LTRIM(RTRIM(Trail.CUSTID))
    WHERE ${range(Prisma.sql`Trail.AccessTime`, window)}
      ${personSql}
      ${textSql}
    ORDER BY Trail.AccessTime DESC, Trail.Id DESC
    OFFSET ${offset} ROWS FETCH NEXT ${LOG_PAGE_SIZE} ROWS ONLY
  `;

  return {
    rows: rows.map((row) => ({
      id: Number(row.Id),
      userName: row.UserName?.trim() || "",
      step: row.Transactioninfo?.trim() || "",
      accessTime: asIso(row.AccessTime),
    })),
    totalCount: countOf(rows[0]?.TotalCount),
    page,
    pageSize: LOG_PAGE_SIZE,
  };
}

export async function listMyDetailsExecutionLogs(
  db: HrmsDb,
  employerIdInput: number,
  filters: LogListFilters,
): Promise<MyDetailsExecutionLogList> {
  const employerId = parseEmployerId(employerIdInput);
  const window = clampLogWindow(
    filters.serverFrom ?? filters.from,
    filters.serverTo ?? filters.to,
  );
  const page = pageOf(filters.page);
  const offset = (page - 1) * LOG_PAGE_SIZE;
  const person = textOf(filters.person, 100);
  const text = textOf(filters.text, 100);
  const personSql = person
    ? likeAny(likePattern(person), [
        Prisma.sql`Info.EmploymentNumber`,
        Prisma.sql`Employee.FName`,
        Prisma.sql`Employee.MiddleName`,
        Prisma.sql`Employee.LName`,
        Prisma.sql`Log.CalledByLogin`,
      ])
    : Prisma.empty;
  const textSql = text
    ? likeAny(likePattern(text), [
        Prisma.sql`Log.LogType`,
        Prisma.sql`Log.ProcedureName`,
        Prisma.sql`Log.SectionID`,
        Prisma.sql`Section.Section`,
        Prisma.sql`Log.ErrorMessage`,
        Prisma.sql`Log.Parameters`,
        Prisma.sql`Log.DynamicSQL`,
      ])
    : Prisma.empty;

  const rows = await db.$queryRaw<
    Array<
      Counted & {
        LogID: number | bigint;
        CreatedDate: Date | null;
        LogType: string | null;
        ProcedureName: string | null;
        SectionID: string | null;
        SectionName: string | null;
        EmployeeID: number | bigint | null;
        FullName: string | null;
        EmploymentNumber: string | null;
        RecordIndex: number | bigint | null;
        LoginId: number | bigint | null;
        CalledByLogin: string | null;
        ErrorNumber: number | bigint | null;
        ErrorSeverity: number | bigint | null;
        ErrorState: number | bigint | null;
        ErrorProcedure: string | null;
        ErrorLine: number | bigint | null;
        ErrorMessage: string | null;
        Parameters: string | null;
        DynamicSQL: string | null;
        AdditionalInfo: string | null;
      }
    >
  >`
    SELECT
      Log.LogID,
      Log.CreatedDate,
      Log.LogType,
      Log.ProcedureName,
      Log.SectionID,
      Section.Section AS SectionName,
      Log.EmployeeID,
      LTRIM(RTRIM(CONCAT_WS(' ', Employee.FName, Employee.MiddleName, Employee.LName))) AS FullName,
      Info.EmploymentNumber,
      Log.RecordIndex,
      Log.LoginId,
      Log.CalledByLogin,
      Log.ErrorNumber,
      Log.ErrorSeverity,
      Log.ErrorState,
      Log.ErrorProcedure,
      Log.ErrorLine,
      LEFT(Log.ErrorMessage, 12001) AS ErrorMessage,
      LEFT(Log.Parameters, 12001) AS Parameters,
      LEFT(Log.DynamicSQL, 12001) AS DynamicSQL,
      LEFT(Log.AdditionalInfo, 12001) AS AdditionalInfo,
      COUNT(*) OVER() AS TotalCount
    FROM dbo.TMyDetailsEnhanced_ExecutionLog AS Log
    LEFT JOIN dbo.TEmployee AS Employee
      ON Employee.EmployeeId = Log.EmployeeID
    LEFT JOIN dbo.TEmployeeInfo AS Info
      ON Info.EmployeeId = Employee.EmployeeId
    LEFT JOIN dbo.TEmployeeDetail_Section AS Section
      ON Section.SectionID = TRY_CAST(Log.SectionID AS int)
    WHERE ${range(Prisma.sql`Log.CreatedDate`, window)}
      AND (
        Log.EmployerID = ${employerId}
        OR (Log.EmployerID IS NULL AND Employee.Employerid = ${employerId})
      )
      ${personSql}
      ${textSql}
    ORDER BY Log.CreatedDate DESC, Log.LogID DESC
    OFFSET ${offset} ROWS FETCH NEXT ${LOG_PAGE_SIZE} ROWS ONLY
  `;

  return {
    rows: rows.map((row) => ({
      logId: Number(row.LogID),
      createdDate: asIso(row.CreatedDate),
      logType: row.LogType?.trim() || "CALL",
      procedureName: row.ProcedureName?.trim() || "",
      sectionId: blankToNull(row.SectionID),
      sectionName: blankToNull(row.SectionName),
      employeeId: asInt(row.EmployeeID),
      userName: blankToNull(row.FullName),
      employmentNumber: blankToNull(row.EmploymentNumber),
      recordIndex: asInt(row.RecordIndex),
      loginId: asInt(row.LoginId),
      calledByLogin: blankToNull(row.CalledByLogin),
      errorNumber: asInt(row.ErrorNumber),
      errorSeverity: asInt(row.ErrorSeverity),
      errorState: asInt(row.ErrorState),
      errorProcedure: blankToNull(row.ErrorProcedure),
      errorLine: asInt(row.ErrorLine),
      errorMessage: clipDetail(row.ErrorMessage),
      parameters: clipDetail(row.Parameters),
      dynamicSql: clipDetail(row.DynamicSQL),
      additionalInfo: clipDetail(row.AdditionalInfo),
    })),
    totalCount: countOf(rows[0]?.TotalCount),
    page,
    pageSize: LOG_PAGE_SIZE,
  };
}
