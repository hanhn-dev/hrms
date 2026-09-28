import { Prisma } from "../../generated/prisma/client";
import type { HrmsDb } from "../../shared/client";
import { parseEmployerId, uploadIdSchema } from "../../shared/ids";
import { asIso } from "../../shared/iso";
import {
  ageHours,
  isExpiredUpload,
  isStuckStatus,
  parseUploadTypeKey,
  splitFieldsCsv,
} from "./classify";
import {
  UPLOAD_TYPE_DB,
  type UploadDetail,
  type UploadListFilters,
  type UploadListItem,
  type UploadSectionRollup,
  type UploadTypeKey,
} from "./types";

const KNOWN_UPLOAD_TYPES = [
  UPLOAD_TYPE_DB.creation,
  UPLOAD_TYPE_DB.profile,
  UPLOAD_TYPE_DB.image,
] as const;

type UploadHeaderRow = {
  UploadID: number;
  EmployerID: number | null;
  UploadType: string | null;
  Status: string | null;
  CountryID: number | null;
  CountryName: string | null;
  CategoryID: number | null;
  DocumentID: string | null;
  TemplateID: number | null;
  ErrorMessage: string | null;
  IsShowData: boolean | number | null;
  IsQueue: number | null;
  batchno: number | null;
  CreatedBy: number | null;
  CreatedByName: string | null;
  CreateDate: Date | string | null;
  ValidatedBy: number | null;
  ValidatedOn: Date | string | null;
  ProcessedBy: number | null;
  ProcessedOn: Date | string | null;
  UpdatedDate: Date | string | null;
  TotalRows: number | null;
  ValidRows: number | null;
  InvalidRows: number | null;
  ProcessedRows: number | null;
  UnprocessedRows: number | null;
  SectionCount: number | null;
};

export async function listUploads(
  db: HrmsDb,
  employerId: number,
  filters: UploadListFilters = {},
): Promise<UploadListItem[]> {
  const tenantId = parseEmployerId(employerId);
  const typeFilter = uploadTypeFilter(filters.type);
  const statusFilter =
    filters.status && filters.status.trim() !== ""
      ? Prisma.sql`AND Upload.Status = ${filters.status.trim()}`
      : Prisma.empty;
  const idFilter =
    filters.uploadId && Number.isInteger(filters.uploadId) && filters.uploadId > 0
      ? Prisma.sql`AND Upload.UploadID = ${filters.uploadId}`
      : Prisma.empty;

  const rows = await db.$queryRaw<UploadHeaderRow[]>`
    SELECT
        Upload.UploadID,
        Upload.EmployerID,
        Upload.UploadType,
        Upload.Status,
        Upload.CountryID,
        Country.NICENAME AS CountryName,
        Upload.CategoryID,
        Upload.DocumentID,
        Upload.TemplateID,
        Upload.ErrorMessage,
        Upload.IsShowData,
        Upload.IsQueue,
        Upload.batchno,
        Upload.CreatedBy,
        LTRIM(RTRIM(CONCAT_WS(' ', Creator.FName, Creator.LName))) AS CreatedByName,
        Upload.CreateDate,
        Upload.ValidatedBy,
        Upload.ValidatedOn,
        Upload.ProcessedBy,
        Upload.ProcessedOn,
        Upload.UpdatedDate,
        SUM(ISNULL(Section.Total, 0)) AS TotalRows,
        SUM(ISNULL(Section.Valid, 0)) AS ValidRows,
        SUM(ISNULL(Section.InValid, 0)) AS InvalidRows,
        SUM(ISNULL(Section.Processed, 0)) AS ProcessedRows,
        SUM(ISNULL(Section.UnProcessed, 0)) AS UnprocessedRows,
        COUNT(Section.UploadSectionID) AS SectionCount
    FROM dbo.TEmployeeDetail_Upload AS Upload
    LEFT JOIN dbo.TEmployeeDetail_Upload_Section AS Section
        ON Section.UploadID = Upload.UploadID
    LEFT JOIN dbo.TCOUNTRY AS Country
        ON Country.ID = Upload.CountryID
    LEFT JOIN dbo.TEmployee AS Creator
        ON Creator.EmployeeId = Upload.CreatedBy
    WHERE Upload.EmployerID = ${tenantId}
        AND (
            Upload.UploadType IN (${Prisma.join(
              KNOWN_UPLOAD_TYPES.map((type) => Prisma.sql`${type}`),
            )})
            OR Upload.UploadType IS NULL
        )
        ${typeFilter}
        ${statusFilter}
        ${idFilter}
    GROUP BY
        Upload.UploadID,
        Upload.EmployerID,
        Upload.UploadType,
        Upload.Status,
        Upload.CountryID,
        Country.NICENAME,
        Upload.CategoryID,
        Upload.DocumentID,
        Upload.TemplateID,
        Upload.ErrorMessage,
        Upload.IsShowData,
        Upload.IsQueue,
        Upload.batchno,
        Upload.CreatedBy,
        Creator.FName,
        Creator.LName,
        Upload.CreateDate,
        Upload.ValidatedBy,
        Upload.ValidatedOn,
        Upload.ProcessedBy,
        Upload.ProcessedOn,
        Upload.UpdatedDate
    ORDER BY Upload.CreateDate DESC, Upload.UploadID DESC
  `;
  return rows.map(mapListItem);
}

export async function getUpload(
  db: HrmsDb,
  employerId: number,
  uploadId: number,
): Promise<UploadDetail | null> {
  const tenantId = parseEmployerId(employerId);
  const parsedUploadId = uploadIdSchema.parse(uploadId);
  const headers = await db.$queryRaw<UploadHeaderRow[]>`
    SELECT
        Upload.UploadID,
        Upload.EmployerID,
        Upload.UploadType,
        Upload.Status,
        Upload.CountryID,
        Country.NICENAME AS CountryName,
        Upload.CategoryID,
        Upload.DocumentID,
        Upload.TemplateID,
        Upload.ErrorMessage,
        Upload.IsShowData,
        Upload.IsQueue,
        Upload.batchno,
        Upload.CreatedBy,
        LTRIM(RTRIM(CONCAT_WS(' ', Creator.FName, Creator.LName))) AS CreatedByName,
        Upload.CreateDate,
        Upload.ValidatedBy,
        Upload.ValidatedOn,
        Upload.ProcessedBy,
        Upload.ProcessedOn,
        Upload.UpdatedDate,
        SUM(ISNULL(Section.Total, 0)) AS TotalRows,
        SUM(ISNULL(Section.Valid, 0)) AS ValidRows,
        SUM(ISNULL(Section.InValid, 0)) AS InvalidRows,
        SUM(ISNULL(Section.Processed, 0)) AS ProcessedRows,
        SUM(ISNULL(Section.UnProcessed, 0)) AS UnprocessedRows,
        COUNT(Section.UploadSectionID) AS SectionCount
    FROM dbo.TEmployeeDetail_Upload AS Upload
    LEFT JOIN dbo.TEmployeeDetail_Upload_Section AS Section
        ON Section.UploadID = Upload.UploadID
    LEFT JOIN dbo.TCOUNTRY AS Country
        ON Country.ID = Upload.CountryID
    LEFT JOIN dbo.TEmployee AS Creator
        ON Creator.EmployeeId = Upload.CreatedBy
    WHERE Upload.EmployerID = ${tenantId}
        AND Upload.UploadID = ${parsedUploadId}
    GROUP BY
        Upload.UploadID,
        Upload.EmployerID,
        Upload.UploadType,
        Upload.Status,
        Upload.CountryID,
        Country.NICENAME,
        Upload.CategoryID,
        Upload.DocumentID,
        Upload.TemplateID,
        Upload.ErrorMessage,
        Upload.IsShowData,
        Upload.IsQueue,
        Upload.batchno,
        Upload.CreatedBy,
        Creator.FName,
        Creator.LName,
        Upload.CreateDate,
        Upload.ValidatedBy,
        Upload.ValidatedOn,
        Upload.ProcessedBy,
        Upload.ProcessedOn,
        Upload.UpdatedDate
  `;
  const header = headers[0];
  if (!header) {
    return null;
  }
  const sections = await db.$queryRaw<
    Array<{
      UploadSectionID: number;
      SectionID: number | null;
      Section: string | null;
      Fields: string | null;
      Total: number | null;
      Valid: number | null;
      InValid: number | null;
      Processed: number | null;
      UnProcessed: number | null;
    }>
  >`
    SELECT
        Section.UploadSectionID,
        Section.SectionID,
        Master.Section,
        Section.Fields,
        Section.Total,
        Section.Valid,
        Section.InValid,
        Section.Processed,
        Section.UnProcessed
    FROM dbo.TEmployeeDetail_Upload_Section AS Section
    INNER JOIN dbo.TEmployeeDetail_Upload AS Upload
        ON Upload.UploadID = Section.UploadID
    LEFT JOIN dbo.TEmployeeDetail_Section AS Master
        ON Master.SectionID = Section.SectionID
    WHERE Upload.EmployerID = ${tenantId}
        AND Section.UploadID = ${parsedUploadId}
    ORDER BY Section.SectionID, Section.UploadSectionID
  `;
  const listItem = mapListItem(header);
  return {
    ...listItem,
    employerId: header.EmployerID ?? tenantId,
    templateId: header.TemplateID,
    isQueue: header.IsQueue,
    batchNo: header.batchno,
    validatedBy: header.ValidatedBy,
    processedBy: header.ProcessedBy,
    sections: sections.map(mapSection),
  };
}

function uploadTypeFilter(type: UploadTypeKey | null | undefined): Prisma.Sql {
  if (!type) {
    return Prisma.empty;
  }
  return Prisma.sql`AND Upload.UploadType = ${UPLOAD_TYPE_DB[type]}`;
}

function mapListItem(row: UploadHeaderRow): UploadListItem {
  const created = asDate(row.CreateDate);
  const updated = asDate(row.UpdatedDate) ?? asDate(row.ProcessedOn) ?? asDate(row.ValidatedOn);
  return {
    uploadId: row.UploadID,
    uploadType: row.UploadType,
    type: parseUploadTypeKey(row.UploadType),
    status: row.Status,
    countryId: row.CountryID,
    countryName: row.CountryName,
    categoryId: row.CategoryID,
    documentId: row.DocumentID,
    errorMessage: row.ErrorMessage,
    isShowData: row.IsShowData,
    createdBy: row.CreatedBy,
    createdByName: emptyToNull(row.CreatedByName),
    createdDate: asIso(row.CreateDate),
    validatedOn: asIso(row.ValidatedOn),
    processedOn: asIso(row.ProcessedOn),
    updatedDate: asIso(row.UpdatedDate),
    total: Number(row.TotalRows ?? 0),
    valid: Number(row.ValidRows ?? 0),
    invalid: Number(row.InvalidRows ?? 0),
    processed: Number(row.ProcessedRows ?? 0),
    unprocessed: Number(row.UnprocessedRows ?? 0),
    sectionCount: Number(row.SectionCount ?? 0),
    ageHours: ageHours(created),
    stuck: isStuckStatus(row.Status, updated, created),
    expired: isExpiredUpload(row.Status, created),
  };
}

function mapSection(row: {
  UploadSectionID: number;
  SectionID: number | null;
  Section: string | null;
  Fields: string | null;
  Total: number | null;
  Valid: number | null;
  InValid: number | null;
  Processed: number | null;
  UnProcessed: number | null;
}): UploadSectionRollup {
  const selectedFields = splitFieldsCsv(row.Fields);
  return {
    uploadSectionId: row.UploadSectionID,
    sectionId: row.SectionID,
    section: row.Section,
    fieldsCsv: row.Fields,
    selectedFields,
    fieldCount: selectedFields.length,
    total: Number(row.Total ?? 0),
    valid: Number(row.Valid ?? 0),
    invalid: Number(row.InValid ?? 0),
    processed: Number(row.Processed ?? 0),
    unprocessed: Number(row.UnProcessed ?? 0),
  };
}

function asDate(value: Date | string | null | undefined): Date | null {
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === "string" && value !== "") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

function emptyToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed === "" ? null : trimmed;
}
