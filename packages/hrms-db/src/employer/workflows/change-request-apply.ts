export const CHANGE_REQUEST_STATUSES = ["pending", "approved", "rejected"] as const;

export type ChangeRequestStatus = (typeof CHANGE_REQUEST_STATUSES)[number];

export const APPLY_TABLES = [
  "TEmployee",
  "TEmployeeContactDetails",
  "TEmployeeFamilyDetails",
  "TEmployeeEmergencyContactDetails",
  "TEmployeePassportDetails",
  "TEmployeeVisaInfo",
  "TEmployeeNomination",
  "TEmployeeBankDetails",
  "TCertificationDetails",
  "TEducationDetails",
  "TPastEmploymentDetails",
  "TEmployeeBudgetSourceDetails",
  "TEmployeeAttachment",
  "TEmployeeDetailCustomFields",
] as const;

export type ApplyTableName = (typeof APPLY_TABLES)[number];

export const HISTORY_TABLE_BY_SOURCE: Partial<Record<ApplyTableName, string>> = {
  TEmployee: "TEmployeeHistory",
  TEmployeeFamilyDetails: "TEmployeeFamilyDetails_history",
  /** Core Sp_ApproveRejectMyDetailsReview snapshots bank rows after approve-insert. */
  TEmployeeBankDetails: "TEmployeeBankDetails_History",
};

/**
 * My Details bank GET (section 7) filters `Isdelete IS NULL` — Core approve inserts NULL, not 0.
 * Other child tables allow `IsDelete = 0 OR NULL`.
 */
export function omitIsDeleteOnInsert(table: ApplyTableName): boolean {
  return table === "TEmployeeBankDetails";
}

/**
 * Core bank approve hardcodes `[show] = 1`. Pending adds store Show=0 only on the CR path;
 * the live row must be visible after Troubleshooter apply.
 */
export function forceShowOneOnInsert(table: ApplyTableName): boolean {
  return table === "TEmployeeBankDetails";
}

export const PK_FALLBACK: Record<ApplyTableName, string> = {
  TEmployee: "EmployeeId",
  TEmployeeContactDetails: "EmployeeContactDetailID",
  TEmployeeFamilyDetails: "EmployeeFamilyDetailID",
  TEmployeeEmergencyContactDetails: "EmergencyContactID",
  TEmployeePassportDetails: "Id",
  TEmployeeVisaInfo: "VisaId",
  TEmployeeNomination: "EmployeeNominationId",
  TEmployeeBankDetails: "BankDetailId",
  TCertificationDetails: "CertificationDetailId",
  TEducationDetails: "EducationId",
  TPastEmploymentDetails: "PastEmploymentId",
  TEmployeeBudgetSourceDetails: "EmployeeBudgetSourceDetailID",
  TEmployeeAttachment: "AttachmentId",
  TEmployeeDetailCustomFields: "CustomFieldId",
};

export const SQL_IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;

export type ApplyDetailInput = {
  tableName: string | null;
  dbFieldName: string | null;
  textValueNew: string | null;
  newValue: string | null;
  isNew: unknown;
  childRowId: number | null;
};

export type ApplyWrite = {
  table: ApplyTableName;
  column: string;
  kind: "update" | "insert";
  childRowId: number | null;
  value: string;
};

/** Column name → SQL type name (e.g. bit, nvarchar) for one table. */
export type ApplyColumnTypes = Map<string, string>;

export function changeRequestStatus(isApproved: unknown): ChangeRequestStatus {
  if (isApproved == null) {
    return "pending";
  }
  if (isApproved === true || isApproved === 1 || isApproved === "1") {
    return "approved";
  }
  return "rejected";
}

export function isApplyTable(name: string): name is ApplyTableName {
  return (APPLY_TABLES as readonly string[]).includes(name);
}

export function isNewRow(value: unknown): boolean {
  return value === true || value === 1 || value === "1";
}

export function assertSqlIdent(name: string): string {
  if (!SQL_IDENT.test(name)) {
    throw new Error(`Refusing to use identifier ${name}.`);
  }
  return name;
}

export function isBitSqlType(typeName: string | null | undefined): boolean {
  return (typeName ?? "").trim().toLowerCase() === "bit";
}

/**
 * My Details bank add stores display Y/N in NewValue and Cast(@bit) in TextValueNew.
 * When @bit is NULL, TextValueNew is null and NewValue is still 'N' — coerce before bit INSERT.
 */
export function coerceBitApplyValue(
  textValueNew: string | null,
  newValue: string | null,
): string {
  const candidates = [textValueNew, newValue];
  for (const candidate of candidates) {
    if (candidate == null) {
      continue;
    }
    const trimmed = candidate.trim();
    if (/^[01]$/.test(trimmed)) {
      return trimmed;
    }
  }
  for (const candidate of candidates) {
    if (candidate == null) {
      continue;
    }
    const trimmed = candidate.trim();
    if (trimmed.length === 0) {
      continue;
    }
    const normalized = trimmed.toLowerCase();
    if (normalized === "true" || normalized === "y" || normalized === "yes") {
      return "1";
    }
    if (normalized === "false" || normalized === "n" || normalized === "no") {
      return "0";
    }
  }
  throw new Error(
    `Cannot coerce bit value from TextValueNew=${JSON.stringify(textValueNew)} NewValue=${JSON.stringify(newValue)}.`,
  );
}

export function resolveApplyValue(input: {
  tableName: string;
  dbFieldName: string;
  textValueNew: string | null;
  newValue: string | null;
  dataType?: string | null;
}): { value: string } {
  if (isBitSqlType(input.dataType)) {
    return { value: coerceBitApplyValue(input.textValueNew, input.newValue) };
  }
  const text = input.textValueNew;
  if (text != null && text.includes("Fn_EncryptData")) {
    if (input.newValue == null || input.newValue.length === 0) {
      throw new Error(
        `${input.tableName}.${input.dbFieldName} is encrypted and has no NewValue to apply.`,
      );
    }
    return { value: input.newValue };
  }
  if (text != null) {
    return { value: text };
  }
  if (input.newValue != null) {
    return { value: input.newValue };
  }
  throw new Error(`${input.tableName}.${input.dbFieldName} has no value to apply.`);
}

export function buildApplyPlan(
  details: ApplyDetailInput[],
  columnsByTable: Map<string, Set<string>>,
  typesByTable: Map<string, ApplyColumnTypes> = new Map(),
): ApplyWrite[] {
  const writes: ApplyWrite[] = [];
  for (const detail of details) {
    const tableName = detail.tableName?.trim() ?? "";
    const dbFieldName = detail.dbFieldName?.trim() ?? "";
    if (!tableName || !dbFieldName) {
      continue;
    }
    if (!isApplyTable(tableName)) {
      throw new Error(`Table ${tableName} is not allowed for Troubleshooter apply.`);
    }
    const columns = columnsByTable.get(tableName);
    if (!columns?.has(dbFieldName)) {
      throw new Error(`Column ${tableName}.${dbFieldName} was not found on dbo.`);
    }
    const kind = isNewRow(detail.isNew) ? "insert" : "update";
    if (kind === "update" && (detail.childRowId == null || detail.childRowId <= 0)) {
      throw new Error(`${tableName}.${dbFieldName} is an edit but ChildRowId is missing.`);
    }
    const { value } = resolveApplyValue({
      tableName,
      dbFieldName,
      textValueNew: detail.textValueNew,
      newValue: detail.newValue,
      dataType: typesByTable.get(tableName)?.get(dbFieldName) ?? null,
    });
    writes.push({
      table: tableName,
      column: dbFieldName,
      kind,
      childRowId: kind === "update" ? detail.childRowId : null,
      value,
    });
  }
  if (writes.length === 0) {
    throw new Error("This change request has no applyable field diffs.");
  }
  return writes;
}

export function groupApplyWrites(writes: ApplyWrite[]): {
  updates: Map<string, ApplyWrite[]>;
  inserts: Map<ApplyTableName, ApplyWrite[]>;
} {
  const updates = new Map<string, ApplyWrite[]>();
  const inserts = new Map<ApplyTableName, ApplyWrite[]>();
  for (const write of writes) {
    if (write.kind === "insert") {
      const current = inserts.get(write.table) ?? [];
      current.push(write);
      inserts.set(write.table, current);
      continue;
    }
    const key = `${write.table}:${write.childRowId}`;
    const current = updates.get(key) ?? [];
    current.push(write);
    updates.set(key, current);
  }
  return { updates, inserts };
}

export function pendingApproverFlag(
  employeeId: number,
  pendingManagerIds: Iterable<number>,
): boolean {
  return new Set(pendingManagerIds).has(employeeId);
}
