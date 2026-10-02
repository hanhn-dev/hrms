import { Prisma } from "../../generated/prisma/client";
import type { HrmsDb } from "../../shared/client";
import {
  changeRequestIdSchema,
  employeeIdSchema,
  parseEmployerId,
  workflowIdSchema,
} from "../../shared/ids";
import {
  HISTORY_TABLE_BY_SOURCE,
  PK_FALLBACK,
  assertSqlIdent,
  buildApplyPlan,
  canonicalApplyTable,
  forceShowOneOnInsert,
  groupApplyWrites,
  isApplyTable,
  omitIsDeleteOnInsert,
  type ApplyColumnTypes,
  type ApplyTableName,
  type ApplyWrite,
} from "./change-request-apply";

function sqlIdent(name: string): Prisma.Sql {
  return Prisma.raw(`[${assertSqlIdent(name)}]`);
}
import {
  listConfiguredApprovers,
  requirePendingChangeRequest,
} from "./change-requests";

const REQUEST_TYPE = "EmploymentTypeChange";
const CUSTOM_TABLE: ApplyTableName = "TEmployeeDetailCustomFields";

type Tx = Parameters<Parameters<HrmsDb["$transaction"]>[0]>[0];

type ColumnRow = {
  TableName: string;
  ColumnName: string;
  IsIdentity: boolean | number;
  TypeName: string;
};

export type ChangeRequestDecision = "Approved" | "Rejected";

export type ChangeRequestWriteInput = {
  employerId: number;
  workflowId: number;
  changeRequestId: number;
  approverEmployeeId: number;
  status: ChangeRequestDecision;
  comments: string;
};

function parseComments(value: string): string {
  const comments = value.trim();
  if (comments.length === 0) {
    throw new Error("Comments are required.");
  }
  if (comments.length > 2000) {
    throw new Error("Comments must be at most 2000 characters.");
  }
  return comments;
}

function parseInput(input: ChangeRequestWriteInput): ChangeRequestWriteInput {
  if (input.status !== "Approved" && input.status !== "Rejected") {
    throw new Error("Status must be Approved or Rejected.");
  }
  return {
    employerId: parseEmployerId(input.employerId),
    workflowId: workflowIdSchema.parse(input.workflowId),
    changeRequestId: changeRequestIdSchema.parse(input.changeRequestId),
    approverEmployeeId: employeeIdSchema.parse(input.approverEmployeeId),
    status: input.status,
    comments: parseComments(input.comments),
  };
}

async function assertConfiguredApprover(
  db: HrmsDb,
  input: ChangeRequestWriteInput,
): Promise<void> {
  const groups = await listConfiguredApprovers(
    db,
    input.employerId,
    input.changeRequestId,
  );
  const allowed = groups.some((group) =>
    group.people.some((person) => person.employeeId === input.approverEmployeeId),
  );
  if (!allowed) {
    throw new Error("Selected approver is not configured on this workflow.");
  }
}

async function loadApplyDetails(db: HrmsDb | Tx, changeRequestId: number) {
  return db.$queryRaw<
    Array<{
      ChangeDetailsId: number | null;
      TableName: string | null;
      DBFieldName: string | null;
      TextValueNew: string | null;
      NewValue: string | null;
      IsNew: boolean | number | null;
      ChildRowId: number | null;
      CustDetailId: string | number | null;
    }>
  >`
    SELECT
        Detail.ChangeDetailsId,
        Detail.TableName,
        Detail.DBFieldName,
        Detail.TextValueNew,
        Detail.NewValue,
        Detail.IsNew,
        Detail.ChildRowId,
        Detail.CustDetailId
    FROM dbo.TMyDetailsChangeRequestDetails AS Detail
    WHERE Detail.ChangeRequestId = ${changeRequestId}
  `;
}

function asId(value: number | string | null | undefined): number | null {
  if (value == null || value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toApplyInput(row: Awaited<ReturnType<typeof loadApplyDetails>>[number]) {
  return {
    tableName: row.TableName,
    dbFieldName: row.DBFieldName,
    textValueNew: row.TextValueNew,
    newValue: row.NewValue,
    isNew: row.IsNew,
    childRowId: asId(row.ChildRowId),
    changeDetailsId: asId(row.ChangeDetailsId),
    custDetailId: row.CustDetailId == null ? null : String(row.CustDetailId),
  };
}

async function loadColumns(db: HrmsDb | Tx, tables: string[]): Promise<ColumnRow[]> {
  const allowed = tables.filter((table) => isApplyTable(table));
  if (allowed.length === 0) {
    return [];
  }
  return db.$queryRaw<ColumnRow[]>`
    SELECT
        Tables.name AS TableName,
        Columns.name AS ColumnName,
        Columns.is_identity AS IsIdentity,
        Types.name AS TypeName
    FROM sys.columns AS Columns
    INNER JOIN sys.tables AS Tables
        ON Tables.object_id = Columns.object_id
    INNER JOIN sys.schemas AS Schemas
        ON Schemas.schema_id = Tables.schema_id
    INNER JOIN sys.types AS Types
        ON Types.user_type_id = Columns.user_type_id
    WHERE Schemas.name = 'dbo'
        AND Tables.name IN (${Prisma.join(allowed.map((table) => Prisma.sql`${table}`))})
  `;
}

function canonicalTableKey(name: string): string {
  return canonicalApplyTable(name) ?? name;
}

function columnsByTable(rows: ColumnRow[]): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const row of rows) {
    const table = canonicalTableKey(row.TableName);
    const current = map.get(table) ?? new Set<string>();
    current.add(row.ColumnName);
    map.set(table, current);
  }
  return map;
}

function typesByTable(rows: ColumnRow[]): Map<string, ApplyColumnTypes> {
  const map = new Map<string, ApplyColumnTypes>();
  for (const row of rows) {
    const table = canonicalTableKey(row.TableName);
    const current = map.get(table) ?? new Map<string, string>();
    current.set(row.ColumnName, row.TypeName);
    map.set(table, current);
  }
  return map;
}

function pickColumn(columns: Set<string>, candidates: string[]): string | null {
  const lookup = new Map([...columns].map((name) => [name.toLowerCase(), name]));
  for (const candidate of candidates) {
    const match = lookup.get(candidate.toLowerCase());
    if (match) {
      return match;
    }
  }
  return null;
}

function resolvePk(table: ApplyTableName, columns: ColumnRow[]): string {
  const identity = columns.find(
    (row) =>
      canonicalTableKey(row.TableName) === table &&
      (row.IsIdentity === true || row.IsIdentity === 1),
  );
  if (identity) {
    return identity.ColumnName;
  }
  return PK_FALLBACK[table];
}

function stampSets(
  columns: Set<string>,
  approverEmployeeId: number,
  kind: "update" | "insert",
): Prisma.Sql[] {
  const sets: Prisma.Sql[] = [];
  const by = pickColumn(
    columns,
    kind === "insert"
      ? ["UpdatedBy", "LastUpdatedBy", "ModifiedBy", "CreatedBy"]
      : ["UpdatedBy", "LastUpdatedBy", "ModifiedBy"],
  );
  const at = pickColumn(
    columns,
    kind === "insert"
      ? ["UpdatedDate", "LastUpdatedOn", "ModifiedDate", "CreatedDate"]
      : ["UpdatedDate", "LastUpdatedOn", "ModifiedDate"],
  );
  const utc = pickColumn(columns, [
    "UpdatedDateUtc",
    "UpdatedDateUtcTime",
    "LastUpdatedOnUtcTime",
    "ModifiedDateUtcTime",
    "CreatedDateUtc",
    "CreatedDateUtcTime",
  ]);
  if (kind === "insert") {
    const createdBy = pickColumn(columns, ["CreatedBy"]);
    const createdDate = pickColumn(columns, ["CreatedDate"]);
    const createdUtc = pickColumn(columns, ["CreatedDateUtc", "CreatedDateUtcTime"]);
    if (createdBy) {
      sets.push(Prisma.sql`${sqlIdent(createdBy)} = ${approverEmployeeId}`);
    }
    if (createdDate) {
      sets.push(Prisma.sql`${sqlIdent(createdDate)} = GETDATE()`);
    }
    if (createdUtc) {
      sets.push(Prisma.sql`${sqlIdent(createdUtc)} = GETUTCDATE()`);
    }
  }
  if (by) {
    sets.push(Prisma.sql`${sqlIdent(by)} = ${approverEmployeeId}`);
  }
  if (at) {
    sets.push(Prisma.sql`${sqlIdent(at)} = GETDATE()`);
  }
  if (utc && utc.toLowerCase().includes("upd")) {
    sets.push(Prisma.sql`${sqlIdent(utc)} = GETUTCDATE()`);
  }
  return sets;
}

async function tableExists(tx: Tx, table: string): Promise<boolean> {
  const rows = await tx.$queryRaw<Array<{ present: number }>>`
    SELECT CASE WHEN OBJECT_ID(${`dbo.${table}`}, 'U') IS NULL THEN 0 ELSE 1 END AS present
  `;
  return rows[0]?.present === 1;
}

async function snapshotHistory(
  tx: Tx,
  sourceTable: ApplyTableName,
  pk: string,
  pkValue: number,
  notes: string[],
): Promise<void> {
  const history = HISTORY_TABLE_BY_SOURCE[sourceTable];
  if (!history) {
    return;
  }
  if (!(await tableExists(tx, history))) {
    notes.push(`History table ${history} is missing; skipped snapshot for ${sourceTable}.`);
    return;
  }
  // Overlapping columns are copied from the live row. A history-only datetime that is
  // NOT NULL and has no default (LastModifiedOn on family, contact, education, nomination)
  // is filled with GETDATE() so the INSERT does not roll back the approve.
  const columns = await tx.$queryRaw<Array<{ ColumnName: string; FromLive: number }>>`
    SELECT
        HistoryColumns.name AS ColumnName,
        CASE WHEN SourceColumns.column_id IS NULL THEN 0 ELSE 1 END AS FromLive
    FROM sys.columns AS HistoryColumns
    INNER JOIN sys.tables AS HistoryTables
        ON HistoryTables.object_id = HistoryColumns.object_id
    INNER JOIN sys.schemas AS HistorySchemas
        ON HistorySchemas.schema_id = HistoryTables.schema_id
    INNER JOIN sys.types AS HistoryTypes
        ON HistoryTypes.user_type_id = HistoryColumns.user_type_id
    INNER JOIN sys.tables AS SourceTables
        ON SourceTables.name = ${sourceTable}
    INNER JOIN sys.schemas AS SourceSchemas
        ON SourceSchemas.schema_id = SourceTables.schema_id
        AND SourceSchemas.name = 'dbo'
    LEFT JOIN sys.columns AS SourceColumns
        ON SourceColumns.object_id = SourceTables.object_id
        AND SourceColumns.name = HistoryColumns.name
        AND SourceColumns.is_computed = 0
        AND (
            SourceColumns.is_identity = 0
            OR SourceColumns.name = ${pk}
        )
    WHERE HistorySchemas.name = 'dbo'
        AND HistoryTables.name = ${history}
        AND HistoryColumns.is_identity = 0
        AND HistoryColumns.is_computed = 0
        AND (
            SourceColumns.column_id IS NOT NULL
            OR (
                HistoryColumns.is_nullable = 0
                AND HistoryColumns.default_object_id = 0
                AND HistoryTypes.name IN ('datetime', 'datetime2', 'smalldatetime', 'date')
            )
        )
  `;
  const copied = columns.filter((row) => Number(row.FromLive) === 1);
  if (copied.length === 0) {
    notes.push(`No overlapping columns for ${sourceTable} → ${history}; skipped snapshot.`);
    return;
  }
  const idents = columns.map((row) => sqlIdent(row.ColumnName));
  const selects = columns.map((row) =>
    Number(row.FromLive) === 1 ? sqlIdent(row.ColumnName) : Prisma.sql`GETDATE()`,
  );
  await tx.$executeRaw`
    INSERT INTO dbo.${sqlIdent(history)} (${Prisma.join(idents)})
    SELECT ${Prisma.join(selects)}
    FROM dbo.${sqlIdent(sourceTable)}
    WHERE ${sqlIdent(pk)} = ${pkValue}
  `;
}

async function applyUpdates(
  tx: Tx,
  writes: Map<string, ApplyWrite[]>,
  columnRows: ColumnRow[],
  columnSets: Map<string, Set<string>>,
  approverEmployeeId: number,
  notes: string[],
): Promise<void> {
  for (const [key, group] of writes) {
    const table = group[0]?.table;
    const childRowId = group[0]?.childRowId;
    if (!table || childRowId == null) {
      continue;
    }
    const columns = columnSets.get(table);
    if (!columns) {
      throw new Error(`Columns for ${table} were not loaded.`);
    }
    const pk = resolvePk(table, columnRows);
    // Personal history is the row before this edit. Child sections are snapshotted
    // after the write so Past History shows the approved values.
    if (table === "TEmployee") {
      await snapshotHistory(tx, table, pk, childRowId, notes);
    }
    const sets = [
      ...group.map((write) => Prisma.sql`${sqlIdent(write.column)} = ${write.value}`),
      ...stampSets(columns, approverEmployeeId, "update"),
    ];
    const updated = await tx.$executeRaw`
      UPDATE dbo.${sqlIdent(table)}
      SET ${Prisma.join(sets)}
      WHERE ${sqlIdent(pk)} = ${childRowId}
    `;
    if (Number(updated) === 0) {
      throw new Error(`${table} row ${childRowId} was not found for ${key}.`);
    }
    if (table !== "TEmployee") {
      await snapshotHistory(tx, table, pk, childRowId, notes);
    }
  }
}

async function applyInserts(
  tx: Tx,
  writes: Map<ApplyTableName, ApplyWrite[]>,
  columnRows: ColumnRow[],
  columnSets: Map<string, Set<string>>,
  subjectEmployeeId: number,
  approverEmployeeId: number,
  changeRequestId: number,
  employerId: number,
  notes: string[],
): Promise<void> {
  for (const [table, group] of writes) {
    const columns = columnSets.get(table);
    if (!columns) {
      throw new Error(`Columns for ${table} were not loaded.`);
    }
    const pk = resolvePk(table, columnRows);
    const employeeCol = pickColumn(columns, ["EmployeeId", "EmployeeID"]);
    const names: string[] = [];
    const values: Prisma.Sql[] = [];
    if (employeeCol) {
      names.push(employeeCol);
      values.push(Prisma.sql`${subjectEmployeeId}`);
    }
    const deleteCol = pickColumn(columns, ["IsDelete", "IsDeleted"]);
    // Bank Details GET requires IsDelete IS NULL (Core approve inserts NULL, not 0).
    if (deleteCol && !omitIsDeleteOnInsert(table)) {
      names.push(deleteCol);
      values.push(Prisma.sql`${0}`);
    }
    const createdBy = pickColumn(columns, ["CreatedBy"]);
    const createdDate = pickColumn(columns, ["CreatedDate"]);
    const createdUtc = pickColumn(columns, ["CreatedDateUtc", "CreatedDateUtcTime"]);
    const updatedBy = pickColumn(columns, ["UpdatedBy", "LastUpdatedBy", "ModifiedBy"]);
    const updatedDate = pickColumn(columns, ["UpdatedDate", "LastUpdatedOn", "ModifiedDate"]);
    const updatedUtc = pickColumn(columns, [
      "UpdatedDateUtc",
      "UpdatedDateUtcTime",
      "LastUpdatedOnUtcTime",
      "ModifiedDateUtcTime",
    ]);
    if (createdBy) {
      names.push(createdBy);
      values.push(Prisma.sql`${approverEmployeeId}`);
    }
    if (createdDate) {
      names.push(createdDate);
      values.push(Prisma.sql`GETDATE()`);
    }
    if (createdUtc) {
      names.push(createdUtc);
      values.push(Prisma.sql`GETUTCDATE()`);
    }
    if (updatedBy && !names.includes(updatedBy)) {
      names.push(updatedBy);
      values.push(Prisma.sql`${approverEmployeeId}`);
    }
    if (updatedDate && !names.includes(updatedDate)) {
      names.push(updatedDate);
      values.push(Prisma.sql`GETDATE()`);
    }
    if (updatedUtc && !names.includes(updatedUtc)) {
      names.push(updatedUtc);
      values.push(Prisma.sql`GETUTCDATE()`);
    }
    const used = new Set(names);
    if (forceShowOneOnInsert(table)) {
      const showCol = pickColumn(columns, ["Show"]);
      if (showCol && !used.has(showCol)) {
        used.add(showCol);
        names.push(showCol);
        values.push(Prisma.sql`${1}`);
      }
    }
    for (const write of group) {
      if (used.has(write.column)) {
        continue;
      }
      used.add(write.column);
      names.push(write.column);
      values.push(Prisma.sql`${write.value}`);
    }
    const inserted = await tx.$queryRaw<Array<{ Id: number }>>`
      INSERT INTO dbo.${sqlIdent(table)} (${Prisma.join(names.map(sqlIdent))})
      OUTPUT INSERTED.${sqlIdent(pk)} AS Id
      VALUES (${Prisma.join(values)})
    `;
    const newId = inserted[0]?.Id;
    if (newId == null) {
      throw new Error(`Insert into ${table} did not return an identity.`);
    }
    // Core copies the new parent id onto every detail still keyed by this request,
    // including TemployeedetailCustomFields, so the custom field attaches to that row.
    await tx.$executeRaw`
      UPDATE dbo.TMyDetailsChangeRequestDetails
      SET CustDetailId = ${String(newId)}
      WHERE ChangeRequestId = ${changeRequestId}
          AND (
              CustDetailId = ${String(changeRequestId)}
              OR CustDetailId IS NULL
          )
    `;
    if (table === "TEmployeeBankDetails") {
      await resolveBankBranchId(tx, newId, group, employerId, notes);
    }
    await snapshotHistory(tx, table, pk, newId, notes);
  }
}

function custDetailSql(value: string | number | null | undefined): Prisma.Sql {
  if (value == null) {
    return Prisma.sql`NULL`;
  }
  const text = String(value).trim();
  if (text.length === 0 || text.toLowerCase() === "null") {
    return Prisma.sql`NULL`;
  }
  if (!/^\d+$/.test(text)) {
    throw new Error(`CustDetailId ${text} is not an integer.`);
  }
  return Prisma.sql`${Number(text)}`;
}

function groupCustomFieldWrites(writes: ApplyWrite[]): Array<{
  fieldId: number;
  changeDetailsId: number;
  value: string;
}> {
  const groups = new Map<number, { fieldId: number; changeDetailsId: number; value: string }>();
  for (const write of writes) {
    if (write.changeDetailsId == null || write.changeDetailsId <= 0) {
      throw new Error(`${CUSTOM_TABLE}.${write.column} is missing ChangeDetailsId.`);
    }
    if (write.childRowId == null || write.childRowId <= 0) {
      throw new Error(
        `${CUSTOM_TABLE}.${write.column} is a custom field but ChildRowId (CustFieldID) is missing.`,
      );
    }
    const existing = groups.get(write.changeDetailsId);
    if (!existing || write.column.toLowerCase() === "customvalue") {
      groups.set(write.changeDetailsId, {
        fieldId: write.childRowId,
        changeDetailsId: write.changeDetailsId,
        value: write.value,
      });
    }
  }
  return [...groups.values()];
}

/**
 * Core Sp_ApproveRejectMyDetailsReview deletes the employee's rows for these CustFieldIDs,
 * then inserts EmployeeId, CustFieldID (ChildRowId), CustomValue, EmployerId, audit columns,
 * and CustDetailId. ChildRowId is the field id, not CustomFieldId.
 */
async function applyCustomFields(
  tx: Tx,
  writes: ApplyWrite[],
  columnRows: ColumnRow[],
  columnSets: Map<string, Set<string>>,
  subjectEmployeeId: number,
  changeRequestId: number,
  employerId: number,
  notes: string[],
): Promise<void> {
  if (writes.length === 0) {
    return;
  }
  const columns = columnSets.get(CUSTOM_TABLE);
  if (!columns) {
    throw new Error(`Columns for ${CUSTOM_TABLE} were not loaded.`);
  }
  const pk = resolvePk(CUSTOM_TABLE, columnRows);
  const groups = groupCustomFieldWrites(writes);
  const fieldIds = [...new Set(groups.map((group) => group.fieldId))];
  const employeeCol = pickColumn(columns, ["EmployeeId", "EmployeeID"]);
  const fieldCol = pickColumn(columns, ["CustFieldID", "CustFieldId"]);
  const valueCol = pickColumn(columns, ["CustomValue"]);
  const employerCol = pickColumn(columns, ["EmployerId", "EmployerID"]);
  const custDetailCol = pickColumn(columns, ["CustDetailId"]);
  if (!employeeCol || !fieldCol || !valueCol) {
    throw new Error(`${CUSTOM_TABLE} is missing EmployeeId, CustFieldID, or CustomValue.`);
  }
  await tx.$executeRaw`
    DELETE FROM dbo.${sqlIdent(CUSTOM_TABLE)}
    WHERE ${sqlIdent(employeeCol)} = ${subjectEmployeeId}
        AND ${sqlIdent(fieldCol)} IN (${Prisma.join(fieldIds)})
  `;
  const linked = await tx.$queryRaw<
    Array<{ ChangeDetailsId: number; CustDetailId: string | number | null }>
  >`
    SELECT ChangeDetailsId, CustDetailId
    FROM dbo.TMyDetailsChangeRequestDetails
    WHERE ChangeRequestId = ${changeRequestId}
        AND TableName = ${CUSTOM_TABLE}
  `;
  const custDetailById = new Map(
    linked.map((row) => [Number(row.ChangeDetailsId), row.CustDetailId]),
  );
  const createdBy = pickColumn(columns, ["CreatedBy"]);
  const modifiedBy = pickColumn(columns, ["ModifiedBy"]);
  const modifiedDate = pickColumn(columns, ["ModifiedDate"]);
  const modifiedUtc = pickColumn(columns, ["ModifiedDateUtc", "ModifiedDateUtcTime"]);
  for (const group of groups) {
    if (!custDetailById.has(group.changeDetailsId)) {
      throw new Error(
        `Custom field detail ${group.changeDetailsId} was not found after linking CustDetailId.`,
      );
    }
    const names = [employeeCol, fieldCol, valueCol];
    const values = [
      Prisma.sql`${subjectEmployeeId}`,
      Prisma.sql`${group.fieldId}`,
      Prisma.sql`${group.value}`,
    ];
    if (employerCol) {
      names.push(employerCol);
      values.push(Prisma.sql`${employerId}`);
    }
    if (createdBy) {
      names.push(createdBy);
      values.push(Prisma.sql`${subjectEmployeeId}`);
    }
    if (modifiedBy && modifiedBy !== createdBy) {
      names.push(modifiedBy);
      values.push(Prisma.sql`${subjectEmployeeId}`);
    }
    if (modifiedDate) {
      names.push(modifiedDate);
      values.push(Prisma.sql`GETDATE()`);
    }
    if (modifiedUtc) {
      names.push(modifiedUtc);
      values.push(Prisma.sql`GETUTCDATE()`);
    }
    if (custDetailCol) {
      names.push(custDetailCol);
      values.push(custDetailSql(custDetailById.get(group.changeDetailsId)));
    }
    const inserted = await tx.$queryRaw<Array<{ Id: number }>>`
      INSERT INTO dbo.${sqlIdent(CUSTOM_TABLE)} (${Prisma.join(names.map(sqlIdent))})
      OUTPUT INSERTED.${sqlIdent(pk)} AS Id
      VALUES (${Prisma.join(values)})
    `;
    const newId = inserted[0]?.Id;
    if (newId == null) {
      throw new Error(`Insert into ${CUSTOM_TABLE} did not return an identity.`);
    }
    await snapshotHistory(tx, CUSTOM_TABLE, pk, Number(newId), notes);
  }
}

/**
 * Mirrors Sp_ApproveRejectMyDetailsReview: map submitted BranchCode (+ BankName) to
 * TBankBranchDetails.ID on the new TEmployeeBankDetails row.
 */
async function resolveBankBranchId(
  tx: Tx,
  bankDetailId: number,
  group: ApplyWrite[],
  employerId: number,
  notes: string[],
): Promise<void> {
  const branchCode = group
    .find((write) => write.column.toLowerCase() === "branchcode")
    ?.value.trim();
  if (!branchCode) {
    notes.push("Bank insert has no BranchCode; skipped branch ID resolve.");
    return;
  }
  const bankName = group
    .find((write) => write.column.toLowerCase() === "bankname")
    ?.value.trim();
  const matched = bankName
    ? await tx.$queryRaw<Array<{ Id: number }>>`
        SELECT TOP 1 Branch.ID AS Id
        FROM dbo.TBankBranchDetails AS Branch
        INNER JOIN dbo.Tbank AS Bank
            ON Bank.BankID = Branch.BankID
            AND Bank.Employerid = Branch.Employerid
        WHERE UPPER(LTRIM(RTRIM(Branch.BankIdentifier))) = UPPER(LTRIM(RTRIM(${branchCode})))
            AND Branch.Employerid = ${employerId}
            AND Branch.IsActive = 'Y'
            AND UPPER(LTRIM(RTRIM(Bank.BankName))) = UPPER(LTRIM(RTRIM(${bankName})))
      `
    : await tx.$queryRaw<Array<{ Id: number }>>`
        SELECT TOP 1 Branch.ID AS Id
        FROM dbo.TBankBranchDetails AS Branch
        WHERE UPPER(LTRIM(RTRIM(Branch.BankIdentifier))) = UPPER(LTRIM(RTRIM(${branchCode})))
            AND Branch.Employerid = ${employerId}
            AND Branch.IsActive = 'Y'
      `;
  const branchId = matched[0]?.Id;
  if (branchId == null) {
    notes.push(
      `No TBankBranchDetails match for BranchCode=${branchCode}; left TEmployeeBankDetails.ID null.`,
    );
    return;
  }
  await tx.$executeRaw`
    UPDATE dbo.TEmployeeBankDetails
    SET ID = ${branchId}
    WHERE BankDetailId = ${bankDetailId}
  `;
}

async function closeRequest(
  tx: Tx,
  input: ChangeRequestWriteInput,
  subjectEmployeeId: number,
): Promise<void> {
  const approved = input.status === "Approved" ? 1 : 0;
  const queueStatus = input.status === "Approved" ? "C" : "R";
  const header = await tx.$executeRaw`
    UPDATE dbo.TMyDetailsChangeRequests
    SET
        IsApproved = ${approved},
        Comments = ${input.comments}
    WHERE ChangeRequestId = ${input.changeRequestId}
        AND EmployerId = ${input.employerId}
        AND EmployeeId = ${subjectEmployeeId}
        AND IsApproved IS NULL
        AND Comments IS NULL
  `;
  if (Number(header) === 0) {
    throw new Error("Change request was not pending; nothing was updated.");
  }
  await tx.$executeRaw`
    UPDATE dbo.TRequestWorkflows
    SET
        IsApprove = 1,
        ApproveStatus = ${queueStatus},
        UpdatedBy = ${input.approverEmployeeId},
        UpdatedDate = GETDATE(),
        Comments = ${input.comments}
    WHERE RequestTransid = ${input.changeRequestId}
        AND RequestType = ${REQUEST_TYPE}
        AND WorkflowId = ${input.workflowId}
        AND ApproveStatus = 'P'
        AND ISNULL(IsDeleted, 0) = 0
  `;
}

export async function getChangeRequestWritePreview(
  db: HrmsDb,
  input: ChangeRequestWriteInput,
): Promise<{ preview: Array<Record<string, unknown>>; notes: string[] }> {
  const parsed = parseInput(input);
  const header = await requirePendingChangeRequest(
    db,
    parsed.employerId,
    parsed.workflowId,
    parsed.changeRequestId,
    parsed.approverEmployeeId,
  );
  await assertConfiguredApprover(db, parsed);
  const notes = [
    [
      `Request ${parsed.changeRequestId}`,
      header.EmployeeName ? `employee ${header.EmployeeName}` : null,
      header.PageName ? `page ${header.PageName}` : null,
      `approver ${parsed.approverEmployeeId}`,
      parsed.comments,
    ]
      .filter(Boolean)
      .join(" · "),
  ];
  const preview: Array<Record<string, unknown>> = [
    {
      Action: parsed.status === "Approved" ? "Approve" : "Reject",
      Table: "TMyDetailsChangeRequests",
      Column: "IsApproved",
      Row: parsed.changeRequestId,
      Value: parsed.status === "Approved" ? 1 : 0,
    },
    {
      Action: parsed.status === "Approved" ? "Approve" : "Reject",
      Table: "TRequestWorkflows",
      Column: "ApproveStatus",
      Row: parsed.changeRequestId,
      Value: parsed.status === "Approved" ? "C" : "R",
    },
  ];
  if (parsed.status === "Rejected") {
    notes.push("Reject closes the queue and does not apply live field diffs.");
    return { preview, notes };
  }
  const details = await loadApplyDetails(db, parsed.changeRequestId);
  const tables = [
    ...new Set(details.map((row) => row.TableName).filter((name): name is string => Boolean(name))),
  ];
  const columnRows = await loadColumns(db, tables);
  const writes = buildApplyPlan(
    details.map(toApplyInput),
    columnsByTable(columnRows),
    typesByTable(columnRows),
  );
  for (const write of writes) {
    preview.push({
      Action: write.kind === "insert" ? "INSERT" : "UPDATE",
      Table: write.table,
      Column: write.column,
      Row: write.childRowId,
      Value: write.value,
    });
  }
  notes.push("Applies those field diffs, then closes the queue. No email and no next routing level.");
  return { preview, notes };
}

export async function decideChangeRequest(
  db: HrmsDb,
  input: ChangeRequestWriteInput,
): Promise<Array<Record<string, unknown>>> {
  const parsed = parseInput(input);
  const header = await requirePendingChangeRequest(
    db,
    parsed.employerId,
    parsed.workflowId,
    parsed.changeRequestId,
    parsed.approverEmployeeId,
  );
  await assertConfiguredApprover(db, parsed);

  await db.$transaction(async (tx) => {
    if (parsed.status === "Approved") {
      const details = await loadApplyDetails(tx, parsed.changeRequestId);
      const tables = [
        ...new Set(
          details.map((row) => row.TableName).filter((name): name is string => Boolean(name)),
        ),
      ];
      const columnRows = await loadColumns(tx, tables);
      const columnSets = columnsByTable(columnRows);
      const writes = buildApplyPlan(
        details.map(toApplyInput),
        columnSets,
        typesByTable(columnRows),
      );
      const customWrites = writes.filter((write) => write.table === CUSTOM_TABLE);
      const grouped = groupApplyWrites(writes.filter((write) => write.table !== CUSTOM_TABLE));
      const notes: string[] = [];
      await applyUpdates(
        tx,
        grouped.updates,
        columnRows,
        columnSets,
        parsed.approverEmployeeId,
        notes,
      );
      await applyInserts(
        tx,
        grouped.inserts,
        columnRows,
        columnSets,
        header.EmployeeId,
        parsed.approverEmployeeId,
        parsed.changeRequestId,
        parsed.employerId,
        notes,
      );
      await applyCustomFields(
        tx,
        customWrites,
        columnRows,
        columnSets,
        header.EmployeeId,
        parsed.changeRequestId,
        parsed.employerId,
        notes,
      );
    }
    await closeRequest(tx, parsed, header.EmployeeId);
  });

  const after = await db.$queryRaw<
    Array<{ ChangeRequestId: number; IsApproved: boolean | number | null; Comments: string | null }>
  >`
    SELECT
        ChangeRequest.ChangeRequestId,
        ChangeRequest.IsApproved,
        ChangeRequest.Comments
    FROM dbo.TMyDetailsChangeRequests AS ChangeRequest
    WHERE ChangeRequest.ChangeRequestId = ${parsed.changeRequestId}
        AND ChangeRequest.EmployerId = ${parsed.employerId}
  `;
  const row = after[0];
  if (!row || row.IsApproved == null) {
    throw new Error("Change request is still pending after the write.");
  }
  return [
    {
      ChangeRequestId: row.ChangeRequestId,
      IsApproved: row.IsApproved,
      Comments: row.Comments,
    },
  ];
}
