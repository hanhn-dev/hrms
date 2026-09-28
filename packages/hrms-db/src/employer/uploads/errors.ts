import { Prisma } from "../../generated/prisma/client";
import type { HrmsDb } from "../../shared/client";
import { parseEmployerId, uploadIdSchema } from "../../shared/ids";
import { asIso } from "../../shared/iso";
import {
  isMissingObjectError,
  parseSectionDataRows,
  parseSectionRows,
  parseUploadTypeKey,
  splitFieldsCsv,
  truncateText,
} from "./classify";
import {
  BATCH_JSON_PREVIEW_LENGTH,
  DYNAMIC_SQL_PREVIEW_LENGTH,
  MAX_CLASSIFIED_ROWS,
  type CreationFinalize,
  type CreationStagingRow,
  type CreationStagingSummary,
  type UploadBatchDetail,
  type UploadBatchRow,
  type UploadCatalogField,
  type UploadErrorClass,
  type UploadExecutionError,
  type UploadLiveRow,
  type UploadRowError,
  type UploadRowErrorResult,
  type UploadSectionData,
} from "./types";

export async function listUploadRowErrors(
  db: HrmsDb,
  employerId: number,
  uploadId: number,
  sectionId: number | null,
  errorClass: Exclude<UploadErrorClass, "system">,
  catalogFields: UploadCatalogField[] = [],
): Promise<UploadRowErrorResult> {
  const tenantId = parseEmployerId(employerId);
  const parsedUploadId = uploadIdSchema.parse(uploadId);
  const sectionFilter =
    sectionId != null && Number.isInteger(sectionId)
      ? Prisma.sql`AND Section.SectionID = ${sectionId}`
      : Prisma.empty;
  const rows = await db.$queryRaw<
    Array<{
      UploadSectionID: number;
      SectionID: number | null;
      Section_JSON: string | null;
    }>
  >`
    SELECT
        Section.UploadSectionID,
        Section.SectionID,
        Section.Section_JSON
    FROM dbo.TEmployeeDetail_Upload_Section AS Section
    INNER JOIN dbo.TEmployeeDetail_Upload AS Upload
        ON Upload.UploadID = Section.UploadID
    WHERE Upload.EmployerID = ${tenantId}
        AND Section.UploadID = ${parsedUploadId}
        ${sectionFilter}
    ORDER BY Section.SectionID, Section.UploadSectionID
  `;

  const classified: UploadRowError[] = [];
  let parseError: string | null = null;
  const fieldByHeader = catalogFieldLookup(catalogFields);

  for (const section of rows) {
    const parsed = parseSectionRows(section.Section_JSON);
    if (parsed.parseError) {
      parseError = parsed.parseError;
    }
    parsed.rows.forEach((row, rowIndex) => {
      if (errorClass === "validation") {
        const invalid =
          row.isValid === false || row.errorFields.length > 0;
        if (!invalid) {
          return;
        }
        const fields =
          row.errorFields.length > 0
            ? row.errorFields
            : [{ fieldName: null, message: "Row failed validation." }];
        for (const field of fields) {
          const catalog = matchCatalogField(fieldByHeader, field.fieldName);
          classified.push({
            rowIndex,
            employeeId: row.employeeId,
            workEmail: row.workEmail,
            employmentNumber: row.employmentNumber,
            employeeName: row.employeeName,
            errorClass: "validation",
            fieldName: field.fieldName,
            message: field.message,
            fieldId: catalog?.fieldId ?? null,
            dbTable: catalog?.dbTable ?? null,
            dbColumn: catalog?.dbColumn ?? null,
            validationRule: catalog?.validationRule ?? null,
            stagingPresent: false,
            isOrphan: false,
          });
        }
        return;
      }

      if (row.unprocessedReasons.length === 0) {
        return;
      }
      for (const reason of row.unprocessedReasons) {
        classified.push({
          rowIndex,
          employeeId: row.employeeId,
          workEmail: row.workEmail,
          employmentNumber: row.employmentNumber,
          employeeName: row.employeeName,
          errorClass: "processing",
          fieldName: null,
          message: reason,
          fieldId: null,
          dbTable: null,
          dbColumn: null,
          validationRule: null,
          stagingPresent: false,
          isOrphan: false,
        });
      }
    });
  }

  const resolved = await resolveRowIdentities(db, tenantId, parsedUploadId, classified);
  return {
    parseError,
    totalMatched: resolved.length,
    rows: resolved.slice(0, MAX_CLASSIFIED_ROWS),
  };
}

export async function listUploadSectionData(
  db: HrmsDb,
  employerId: number,
  uploadId: number,
  uploadSectionId: number | null,
): Promise<UploadSectionData | null> {
  const tenantId = parseEmployerId(employerId);
  const parsedUploadId = uploadIdSchema.parse(uploadId);
  const sectionFilter =
    uploadSectionId != null && Number.isInteger(uploadSectionId) && uploadSectionId > 0
      ? Prisma.sql`AND Section.UploadSectionID = ${uploadSectionId}`
      : Prisma.empty;
  const rows = await db.$queryRaw<
    Array<{
      UploadSectionID: number;
      SectionID: number | null;
      Section: string | null;
      Fields: string | null;
      Section_JSON: string | null;
    }>
  >`
    SELECT TOP (1)
        Section.UploadSectionID,
        Section.SectionID,
        Master.Section,
        Section.Fields,
        Section.Section_JSON
    FROM dbo.TEmployeeDetail_Upload_Section AS Section
    INNER JOIN dbo.TEmployeeDetail_Upload AS Upload
        ON Upload.UploadID = Section.UploadID
    LEFT JOIN dbo.TEmployeeDetail_Section AS Master
        ON Master.SectionID = Section.SectionID
    WHERE Upload.EmployerID = ${tenantId}
        AND Section.UploadID = ${parsedUploadId}
        ${sectionFilter}
    ORDER BY Section.SectionID, Section.UploadSectionID
  `;
  const row = rows[0];
  if (!row) {
    return null;
  }
  const fields = splitFieldsCsv(row.Fields);
  const parsed = parseSectionDataRows(row.Section_JSON, fields);
  const limited = parsed.rows.slice(0, MAX_CLASSIFIED_ROWS);
  const liveByKey = await listUploadLiveEmployees(
    db,
    tenantId,
    limited.map((item) => ({
      employeeId: item.employeeId,
      workEmail: item.workEmail,
    })),
  );
  return {
    uploadSectionId: row.UploadSectionID,
    sectionId: row.SectionID,
    section: row.Section,
    fields,
    parseError: parsed.parseError,
    totalMatched: parsed.rows.length,
    rows: limited.map((item) => {
      const live =
        (item.employeeId ? liveByKey.get(`id:${item.employeeId}`) : undefined) ??
        (item.workEmail ? liveByKey.get(`email:${item.workEmail.toLowerCase()}`) : undefined);
      return {
        ...item,
        employeeId: live?.employeeId ?? item.employeeId,
        workEmail: live?.workEmail ?? item.workEmail,
        employeeName: live?.fullName ?? null,
        employmentNumber: live?.employmentNumber ?? null,
      };
    }),
  };
}

export async function listUploadBatches(
  db: HrmsDb,
  employerId: number,
  uploadId: number,
): Promise<UploadBatchRow[]> {
  return optionalQuery(async () => {
  const tenantId = parseEmployerId(employerId);
  const parsedUploadId = uploadIdSchema.parse(uploadId);
  const rows = await db.$queryRaw<
    Array<{
      ProcessedBatchResultID: number;
      UploadID: number;
      UploadSectionID: number | null;
      BatchNumber: number | null;
      Status: string | null;
      CreadtedDate: Date | string | null;
    }>
  >`
    SELECT
        Batch.ProcessedBatchResultID,
        Batch.UploadID,
        Batch.UploadSectionID,
        Batch.BatchNumber,
        Batch.Status,
        Batch.CreadtedDate
    FROM dbo.TProcessedBatchResult AS Batch
    INNER JOIN dbo.TEmployeeDetail_Upload AS Upload
        ON Upload.UploadID = Batch.UploadID
    WHERE Upload.EmployerID = ${tenantId}
        AND Batch.UploadID = ${parsedUploadId}
    ORDER BY Batch.BatchNumber, Batch.ProcessedBatchResultID
  `;
  return rows.map((row) => ({
    processedBatchResultId: row.ProcessedBatchResultID,
    uploadId: row.UploadID,
    uploadSectionId: row.UploadSectionID,
    batchNumber: row.BatchNumber,
    status: row.Status,
    createdDate: asIso(row.CreadtedDate),
  }));
  }, []);
}

export async function getUploadBatch(
  db: HrmsDb,
  employerId: number,
  uploadId: number,
  batchId: number,
): Promise<UploadBatchDetail | null> {
  return optionalQuery(async () => {
  const tenantId = parseEmployerId(employerId);
  const parsedUploadId = uploadIdSchema.parse(uploadId);
  const parsedBatchId = uploadIdSchema.parse(batchId);
  const rows = await db.$queryRaw<
    Array<{
      ProcessedBatchResultID: number;
      UploadID: number;
      UploadSectionID: number | null;
      BatchNumber: number | null;
      Status: string | null;
      CreadtedDate: Date | string | null;
      EmployeeData: string | null;
      Result: string | null;
    }>
  >`
    SELECT
        Batch.ProcessedBatchResultID,
        Batch.UploadID,
        Batch.UploadSectionID,
        Batch.BatchNumber,
        Batch.Status,
        Batch.CreadtedDate,
        Batch.EmployeeData,
        Batch.Result
    FROM dbo.TProcessedBatchResult AS Batch
    INNER JOIN dbo.TEmployeeDetail_Upload AS Upload
        ON Upload.UploadID = Batch.UploadID
    WHERE Upload.EmployerID = ${tenantId}
        AND Batch.UploadID = ${parsedUploadId}
        AND Batch.ProcessedBatchResultID = ${parsedBatchId}
  `;
  const row = rows[0];
  if (!row) {
    return null;
  }
  return {
    processedBatchResultId: row.ProcessedBatchResultID,
    uploadId: row.UploadID,
    uploadSectionId: row.UploadSectionID,
    batchNumber: row.BatchNumber,
    status: row.Status,
    createdDate: asIso(row.CreadtedDate),
    employeeDataPreview: truncateText(row.EmployeeData, BATCH_JSON_PREVIEW_LENGTH),
    resultPreview: truncateText(row.Result, BATCH_JSON_PREVIEW_LENGTH),
  };
  }, null);
}

export async function listUploadExecutionErrors(
  db: HrmsDb,
  employerId: number,
  uploadId: number,
): Promise<UploadExecutionError[]> {
  return optionalQuery(async () => {
  const tenantId = parseEmployerId(employerId);
  const parsedUploadId = uploadIdSchema.parse(uploadId);
  const headers = await db.$queryRaw<Array<{ UploadType: string | null }>>`
    SELECT Upload.UploadType
    FROM dbo.TEmployeeDetail_Upload AS Upload
    WHERE Upload.EmployerID = ${tenantId}
        AND Upload.UploadID = ${parsedUploadId}
  `;
  const type = parseUploadTypeKey(headers[0]?.UploadType);
  if (type === "creation") {
    return listCreationExecutionErrors(db, tenantId, parsedUploadId);
  }
  return listProfileExecutionErrors(db, tenantId, parsedUploadId);
  }, []);
}

export async function listCreationStaging(
  db: HrmsDb,
  employerId: number,
  uploadId: number,
): Promise<CreationStagingSummary> {
  return optionalQuery(async () => {
  const tenantId = parseEmployerId(employerId);
  const parsedUploadId = uploadIdSchema.parse(uploadId);
  const rows = await db.$queryRaw<
    Array<{
      EmailID: string | null;
      Employeeid: number | null;
      employmentNumber: string | null;
      fName: string | null;
      lName: string | null;
      LiveEmployeeId: number | null;
    }>
  >`
    SELECT
        Staging.EmailID,
        Staging.Employeeid,
        Staging.employmentNumber,
        Staging.fName,
        Staging.lName,
        Live.EmployeeId AS LiveEmployeeId
    FROM dbo.Temployeedetail_Staging_Employee_creation AS Staging
    LEFT JOIN dbo.TEmployee AS Live
        ON Live.EmailID = Staging.EmailID
        AND Live.Employerid = ${tenantId}
    WHERE Staging.UploadId = ${parsedUploadId}
        AND Staging.employerId = ${tenantId}
    ORDER BY Staging.EmailID
  `;
  const mapped: CreationStagingRow[] = rows.map((row) => ({
    emailId: row.EmailID,
    employeeId: row.Employeeid,
    employmentNumber: row.employmentNumber,
    firstName: row.fName,
    lastName: row.lName,
    isOrphan: row.LiveEmployeeId == null,
  }));
  const orphans = mapped.filter((row) => row.isOrphan);
  return {
    stagingCount: mapped.length,
    orphanCount: orphans.length,
    orphans: orphans.slice(0, MAX_CLASSIFIED_ROWS),
  };
  }, { stagingCount: 0, orphanCount: 0, orphans: [] });
}

export async function getCreationFinalize(
  db: HrmsDb,
  employerId: number,
  uploadId: number,
): Promise<CreationFinalize | null> {
  return optionalQuery(async () => {
  const tenantId = parseEmployerId(employerId);
  const parsedUploadId = uploadIdSchema.parse(uploadId);
  const rows = await db.$queryRaw<
    Array<{
      UploadID: number;
      Status: string | null;
      EmploymentNumbersData: string | null;
      FinalizedResult: string | null;
    }>
  >`
    SELECT
        Finalize.UploadID,
        Finalize.Status,
        Finalize.EmploymentNumbersData,
        Finalize.FinalizedResult
    FROM dbo.TEmployeeDetail_Upload_Creation_Finalizing AS Finalize
    INNER JOIN dbo.TEmployeeDetail_Upload AS Upload
        ON Upload.UploadID = Finalize.UploadID
    WHERE Upload.EmployerID = ${tenantId}
        AND Finalize.UploadID = ${parsedUploadId}
  `;
  const row = rows[0];
  if (!row) {
    return null;
  }
  return {
    uploadId: row.UploadID,
    status: row.Status,
    employmentNumbersPreview: truncateText(
      row.EmploymentNumbersData,
      BATCH_JSON_PREVIEW_LENGTH,
    ),
    finalizedResultPreview: truncateText(row.FinalizedResult, BATCH_JSON_PREVIEW_LENGTH),
  };
  }, null);
}

async function listUploadLiveEmployees(
  db: HrmsDb,
  tenantId: number,
  identities: Array<{ employeeId: number | null; workEmail: string | null }>,
): Promise<Map<string, UploadLiveRow>> {
  const employeeIds = uniqueNumbers(identities.map((item) => item.employeeId));
  const emails = uniqueStrings(identities.map((item) => item.workEmail));
  const liveByKey = new Map<string, UploadLiveRow>();
  if (employeeIds.length === 0 && emails.length === 0) {
    return liveByKey;
  }
  const idFilter =
    employeeIds.length > 0
      ? Prisma.sql`Employee.EmployeeId IN (${Prisma.join(employeeIds)})`
      : Prisma.sql`1 = 0`;
  const emailFilter =
    emails.length > 0
      ? Prisma.sql`Employee.EmailID IN (${Prisma.join(emails)})`
      : Prisma.sql`1 = 0`;
  const rows = await db.$queryRaw<
    Array<{
      EmployeeId: number;
      EmploymentNumber: string | null;
      FullName: string | null;
      WorkEmail: string | null;
      IsActive: string | boolean | null;
    }>
  >`
    SELECT
        Employee.EmployeeId,
        EmployeeInfo.EmploymentNumber,
        LTRIM(RTRIM(CONCAT_WS(' ', Employee.FName, Employee.MiddleName, Employee.LName))) AS FullName,
        Employee.EmailID AS WorkEmail,
        Employee.IsActive
    FROM dbo.TEmployee AS Employee
    LEFT JOIN dbo.TEmployeeInfo AS EmployeeInfo
        ON EmployeeInfo.EmployeeId = Employee.EmployeeId
    WHERE Employee.Employerid = ${tenantId}
        AND (${idFilter} OR ${emailFilter})
  `;
  for (const row of rows) {
    const mapped: UploadLiveRow = {
      employeeId: row.EmployeeId,
      employmentNumber: row.EmploymentNumber,
      fullName: emptyToNull(row.FullName),
      workEmail: row.WorkEmail,
      isActive: row.IsActive,
    };
    liveByKey.set(`id:${row.EmployeeId}`, mapped);
    if (row.WorkEmail) {
      liveByKey.set(`email:${row.WorkEmail.toLowerCase()}`, mapped);
    }
  }
  return liveByKey;
}

export async function getUploadLiveRow(
  db: HrmsDb,
  employerId: number,
  identity: { employeeId?: number | null; workEmail?: string | null },
): Promise<UploadLiveRow | null> {
  const tenantId = parseEmployerId(employerId);
  const employeeId = identity.employeeId;
  const workEmail = identity.workEmail?.trim() ?? "";
  if ((!employeeId || employeeId <= 0) && workEmail === "") {
    return null;
  }
  const identityFilter =
    employeeId && employeeId > 0
      ? Prisma.sql`AND Employee.EmployeeId = ${employeeId}`
      : Prisma.sql`AND Employee.EmailID = ${workEmail}`;
  const rows = await db.$queryRaw<
    Array<{
      EmployeeId: number;
      EmploymentNumber: string | null;
      FullName: string | null;
      WorkEmail: string | null;
      IsActive: string | boolean | null;
    }>
  >`
    SELECT TOP (1)
        Employee.EmployeeId,
        EmployeeInfo.EmploymentNumber,
        LTRIM(RTRIM(CONCAT_WS(' ', Employee.FName, Employee.MiddleName, Employee.LName))) AS FullName,
        Employee.EmailID AS WorkEmail,
        Employee.IsActive
    FROM dbo.TEmployee AS Employee
    LEFT JOIN dbo.TEmployeeInfo AS EmployeeInfo
        ON EmployeeInfo.EmployeeId = Employee.EmployeeId
    WHERE Employee.Employerid = ${tenantId}
        ${identityFilter}
  `;
  const row = rows[0];
  if (!row) {
    return null;
  }
  return {
    employeeId: row.EmployeeId,
    employmentNumber: row.EmploymentNumber,
    fullName: emptyToNull(row.FullName),
    workEmail: row.WorkEmail,
    isActive: row.IsActive,
  };
}

export async function getCreationStagingRow(
  db: HrmsDb,
  employerId: number,
  uploadId: number,
  workEmail: string,
): Promise<CreationStagingRow | null> {
  const tenantId = parseEmployerId(employerId);
  const parsedUploadId = uploadIdSchema.parse(uploadId);
  const email = workEmail.trim();
  if (email === "") {
    return null;
  }
  return optionalQuery(async () => {
  const rows = await db.$queryRaw<
    Array<{
      EmailID: string | null;
      Employeeid: number | null;
      employmentNumber: string | null;
      fName: string | null;
      lName: string | null;
      LiveEmployeeId: number | null;
    }>
  >`
    SELECT TOP (1)
        Staging.EmailID,
        Staging.Employeeid,
        Staging.employmentNumber,
        Staging.fName,
        Staging.lName,
        Live.EmployeeId AS LiveEmployeeId
    FROM dbo.Temployeedetail_Staging_Employee_creation AS Staging
    LEFT JOIN dbo.TEmployee AS Live
        ON Live.EmailID = Staging.EmailID
        AND Live.Employerid = ${tenantId}
    WHERE Staging.UploadId = ${parsedUploadId}
        AND Staging.employerId = ${tenantId}
        AND Staging.EmailID = ${email}
  `;
  const row = rows[0];
  if (!row) {
    return null;
  }
  return {
    emailId: row.EmailID,
    employeeId: row.Employeeid,
    employmentNumber: row.employmentNumber,
    firstName: row.fName,
    lastName: row.lName,
    isOrphan: row.LiveEmployeeId == null,
  };
  }, null);
}

async function listProfileExecutionErrors(
  db: HrmsDb,
  tenantId: number,
  uploadId: number,
): Promise<UploadExecutionError[]> {
  const rows = await db.$queryRaw<
    Array<{
      LogID: number;
      LogType: string;
      ProcedureName: string;
      BatchNumber: number | null;
      UploadSectionID: number | null;
      SectionID: string | null;
      EmployeeID: number | null;
      ErrorNumber: number | null;
      ErrorLine: number | null;
      ErrorMessage: string | null;
      DynamicSQL: string | null;
      CreatedDate: Date | string | null;
    }>
  >`
    SELECT
        LogEntry.LogID,
        LogEntry.LogType,
        LogEntry.ProcedureName,
        LogEntry.BatchNumber,
        LogEntry.UploadSectionID,
        LogEntry.SectionID,
        LogEntry.EmployeeID,
        LogEntry.ErrorNumber,
        LogEntry.ErrorLine,
        LogEntry.ErrorMessage,
        LogEntry.DynamicSQL,
        LogEntry.CreatedDate
    FROM dbo.TBulkUpdateProfile_ExecutionLog AS LogEntry
    WHERE LogEntry.EmployerID = ${tenantId}
        AND LogEntry.UploadID = ${uploadId}
        AND LogEntry.LogType = 'ERROR'
    ORDER BY LogEntry.CreatedDate DESC, LogEntry.LogID DESC
  `;
  return rows.map((row) => ({
    logId: Number(row.LogID),
    logType: row.LogType,
    procedureName: row.ProcedureName,
    batchNumber: row.BatchNumber,
    uploadSectionId: row.UploadSectionID,
    sectionId: row.SectionID,
    employeeId: row.EmployeeID,
    workEmail: null,
    errorNumber: row.ErrorNumber,
    errorLine: row.ErrorLine,
    errorMessage: row.ErrorMessage,
    dynamicSql: truncateText(row.DynamicSQL, DYNAMIC_SQL_PREVIEW_LENGTH),
    createdDate: asIso(row.CreatedDate),
  }));
}

async function listCreationExecutionErrors(
  db: HrmsDb,
  tenantId: number,
  uploadId: number,
): Promise<UploadExecutionError[]> {
  const rows = await db.$queryRaw<
    Array<{
      LogID: number;
      LogType: string;
      ProcedureName: string;
      BatchNumber: number | null;
      UploadSectionID: number | null;
      SectionID: string | null;
      WorkEmail: string | null;
      ErrorNumber: number | null;
      ErrorLine: number | null;
      ErrorMessage: string | null;
      DynamicSQL: string | null;
      CreatedDate: Date | string | null;
    }>
  >`
    SELECT
        LogEntry.LogID,
        LogEntry.LogType,
        LogEntry.ProcedureName,
        LogEntry.BatchNumber,
        LogEntry.UploadSectionID,
        LogEntry.SectionID,
        LogEntry.WorkEmail,
        LogEntry.ErrorNumber,
        LogEntry.ErrorLine,
        LogEntry.ErrorMessage,
        LogEntry.DynamicSQL,
        LogEntry.CreatedDate
    FROM dbo.TBulkCreationProfile_ExecutionLog AS LogEntry
    WHERE LogEntry.EmployerID = ${tenantId}
        AND LogEntry.UploadID = ${uploadId}
        AND LogEntry.LogType = 'ERROR'
    ORDER BY LogEntry.CreatedDate DESC, LogEntry.LogID DESC
  `;
  return rows.map((row) => ({
    logId: Number(row.LogID),
    logType: row.LogType,
    procedureName: row.ProcedureName,
    batchNumber: row.BatchNumber,
    uploadSectionId: row.UploadSectionID,
    sectionId: row.SectionID,
    employeeId: null,
    workEmail: row.WorkEmail,
    errorNumber: row.ErrorNumber,
    errorLine: row.ErrorLine,
    errorMessage: row.ErrorMessage,
    dynamicSql: truncateText(row.DynamicSQL, DYNAMIC_SQL_PREVIEW_LENGTH),
    createdDate: asIso(row.CreatedDate),
  }));
}

async function resolveRowIdentities(
  db: HrmsDb,
  tenantId: number,
  uploadId: number,
  rows: UploadRowError[],
): Promise<UploadRowError[]> {
  const employeeIds = uniqueNumbers(rows.map((row) => row.employeeId));
  const emails = uniqueStrings(rows.map((row) => row.workEmail));
  const liveById = new Map<number, UploadLiveRow>();
  const liveByEmail = new Map<string, UploadLiveRow>();
  if (employeeIds.length > 0 || emails.length > 0) {
    const idFilter =
      employeeIds.length > 0
        ? Prisma.sql`Employee.EmployeeId IN (${Prisma.join(employeeIds)})`
        : Prisma.sql`1 = 0`;
    const emailFilter =
      emails.length > 0
        ? Prisma.sql`Employee.EmailID IN (${Prisma.join(emails)})`
        : Prisma.sql`1 = 0`;
    const liveRows = await db.$queryRaw<
      Array<{
        EmployeeId: number;
        EmploymentNumber: string | null;
        FullName: string | null;
        WorkEmail: string | null;
      }>
    >`
      SELECT
          Employee.EmployeeId,
          EmployeeInfo.EmploymentNumber,
          LTRIM(RTRIM(CONCAT_WS(' ', Employee.FName, Employee.MiddleName, Employee.LName))) AS FullName,
          Employee.EmailID AS WorkEmail
      FROM dbo.TEmployee AS Employee
      LEFT JOIN dbo.TEmployeeInfo AS EmployeeInfo
          ON EmployeeInfo.EmployeeId = Employee.EmployeeId
      WHERE Employee.Employerid = ${tenantId}
          AND (${idFilter} OR ${emailFilter})
    `;
    for (const live of liveRows) {
      const mapped: UploadLiveRow = {
        employeeId: live.EmployeeId,
        employmentNumber: live.EmploymentNumber,
        fullName: emptyToNull(live.FullName),
        workEmail: live.WorkEmail,
        isActive: null,
      };
      liveById.set(live.EmployeeId, mapped);
      if (live.WorkEmail) {
        liveByEmail.set(live.WorkEmail.toLowerCase(), mapped);
      }
    }
  }

  const stagingEmails = new Set<string>();
  if (emails.length > 0) {
    const stagingRows = await optionalQuery(
      () =>
        db.$queryRaw<Array<{ EmailID: string | null }>>`
          SELECT Staging.EmailID
          FROM dbo.Temployeedetail_Staging_Employee_creation AS Staging
          WHERE Staging.UploadId = ${uploadId}
              AND Staging.employerId = ${tenantId}
              AND Staging.EmailID IN (${Prisma.join(emails)})
        `,
      [],
    );
    for (const row of stagingRows) {
      if (row.EmailID) {
        stagingEmails.add(row.EmailID.toLowerCase());
      }
    }
  }

  return rows.map((row) => {
    const live =
      (row.employeeId ? liveById.get(row.employeeId) : undefined) ??
      (row.workEmail ? liveByEmail.get(row.workEmail.toLowerCase()) : undefined);
    const stagingPresent = row.workEmail
      ? stagingEmails.has(row.workEmail.toLowerCase())
      : false;
    return {
      ...row,
      employeeId: row.employeeId ?? live?.employeeId ?? null,
      workEmail: row.workEmail ?? live?.workEmail ?? null,
      employmentNumber: row.employmentNumber ?? live?.employmentNumber ?? null,
      employeeName: row.employeeName ?? live?.fullName ?? null,
      stagingPresent,
      isOrphan: stagingPresent && live == null,
    };
  });
}

function catalogFieldLookup(
  fields: UploadCatalogField[],
): Map<string, UploadCatalogField> {
  const lookup = new Map<string, UploadCatalogField>();
  for (const field of fields) {
    const display = field.displayText?.trim().toLowerCase();
    const name = field.fieldName?.trim().toLowerCase();
    if (display) {
      lookup.set(display, field);
    }
    if (name && !lookup.has(name)) {
      lookup.set(name, field);
    }
  }
  return lookup;
}

function matchCatalogField(
  lookup: Map<string, UploadCatalogField>,
  fieldName: string | null,
): UploadCatalogField | undefined {
  if (!fieldName) {
    return undefined;
  }
  return lookup.get(fieldName.trim().toLowerCase());
}

function uniqueNumbers(values: Array<number | null | undefined>): number[] {
  return [...new Set(values.filter((value): value is number => value != null && value > 0))];
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return [
    ...new Set(
      values
        .map((value) => value?.trim() ?? "")
        .filter((value) => value !== ""),
    ),
  ];
}

function emptyToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed === "" ? null : trimmed;
}

async function optionalQuery<T>(run: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (isMissingObjectError(error)) {
      return fallback;
    }
    throw error;
  }
}
