import type { HrmsDb } from "../../shared/client";
import {
  displayOrNotSet,
  groupFieldChangesIntoEvents,
  normalizeDisplayValue,
} from "./diff";
import { asNumber, asTimeStampIso, isTruthyDeleted } from "./sql";
import type {
  HistoryChangeEvent,
  HistoryChangeField,
  HistoryChangeType,
  HistoryEditor,
} from "./types";

type BankHistoryRow = {
  TEmployeeBankDetails_HistoryID: number;
  BankDetailId: number;
  EmployeeId: number;
  AccountNo: string | null;
  AccountType: number | null;
  AccountTypeName: string | null;
  BankName: string | null;
  Payroll: boolean | number | null;
  isDefault: boolean | number | null;
  BranchName: string | null;
  /** My Details bank history uses BranchCode (not BIC) for "Bank Identifier Code". */
  BranchCode: string | null;
  EmpNameAsPerBankRecords: string | null;
  LastUpdatedBy: number | null;
  UpdatedDateUtc: Date | string | null;
  IsDelete: boolean | number | null;
  Show: boolean | number | null;
};

const BANK_FIELDS: Array<{
  key: keyof BankHistoryRow;
  label: string;
  format?: (row: BankHistoryRow) => string;
}> = [
  { key: "AccountNo", label: "Account Number" },
  {
    key: "AccountType",
    label: "Account Type",
    format: (row) => normalizeDisplayValue(row.AccountTypeName),
  },
  { key: "BankName", label: "Bank Name" },
  {
    key: "Payroll",
    label: "Use For Payroll",
    format: (row) => yesNo(row.Payroll),
  },
  {
    key: "isDefault",
    label: "Default",
    format: (row) => yesNo(row.isDefault),
  },
  { key: "BranchName", label: "Branch Name" },
  { key: "BranchCode", label: "Bank Identifier Code" },
  { key: "EmpNameAsPerBankRecords", label: "Name as per Bank Account" },
];

/** Match SP_Mydetails_Enhanced_GetEmpBankHistoryDetails: 1 → Yes, else No. */
function yesNo(value: unknown): string {
  if (value === true || value === 1 || value === "1") {
    return "Yes";
  }
  return "No";
}

function fieldValue(row: BankHistoryRow, field: (typeof BANK_FIELDS)[number]): string {
  if (field.format) {
    return field.format(row);
  }
  return normalizeDisplayValue(row[field.key]);
}

function inferType(oldValue: string, newValue: string, removed: boolean): HistoryChangeType {
  if (removed) {
    return "REMOVED";
  }
  if (oldValue === "" && newValue !== "") {
    return "ADDED";
  }
  if (oldValue !== "" && newValue === "") {
    return "REMOVED";
  }
  return "MODIFIED";
}

/**
 * Bank history matches My Details SP semantics:
 * history-only (`Show = 1`), consecutive LEAD-style diff by BankDetailId across
 * the full series (so in-window events keep a correct previous baseline), then
 * keep only events whose UpdatedDateUtc falls in the requested window.
 * Soft-delete → REMOVED with last values; editor = LastUpdatedBy.
 */
export async function loadBankHistory(
  db: HrmsDb,
  input: {
    employeeId: number;
    from: Date | null;
    toExclusive: Date | null;
    editors: Map<number, HistoryEditor>;
  },
): Promise<HistoryChangeEvent[]> {
  let rows: BankHistoryRow[] = [];
  try {
    rows = await db.$queryRaw<BankHistoryRow[]>`
      SELECT
          H.TEmployeeBankDetails_HistoryID,
          H.BankDetailId,
          H.EmployeeId,
          H.AccountNo,
          H.AccountType,
          A.AccountTypeName,
          H.BankName,
          H.Payroll,
          H.isDefault,
          H.BranchName,
          H.BranchCode,
          H.EmpNameAsPerBankRecords,
          H.LastUpdatedBy,
          H.UpdatedDateUtc,
          H.IsDelete,
          H.Show
      FROM dbo.TEmployeeBankDetails_History AS H
      LEFT JOIN dbo.TAccountType AS A
          ON A.AccountTypeId = H.AccountType
      WHERE H.EmployeeId = ${input.employeeId}
        AND ISNULL(H.Show, 0) = 1
      ORDER BY H.BankDetailId, H.UpdatedDateUtc ASC, H.TEmployeeBankDetails_HistoryID ASC
    `;
  } catch {
    return [];
  }

  const byEntity = new Map<number, BankHistoryRow[]>();
  for (const row of rows) {
    const list = byEntity.get(row.BankDetailId) ?? [];
    list.push(row);
    byEntity.set(row.BankDetailId, list);
  }

  const fromMs = input.from?.getTime() ?? null;
  const toMs = input.toExclusive?.getTime() ?? null;

  const fieldRows: Array<{
    timeStamp: string;
    editorEmployeeId: number | null;
    change: HistoryChangeField;
  }> = [];

  for (const series of byEntity.values()) {
    for (let i = 0; i < series.length; i++) {
      const curr = series[i]!;
      const prev = i === 0 ? null : series[i - 1]!;
      const timeStamp = asTimeStampIso(curr.UpdatedDateUtc);
      if (!timeStamp) {
        continue;
      }
      const eventMs = new Date(timeStamp).getTime();
      if (Number.isNaN(eventMs)) {
        continue;
      }
      if (fromMs != null && eventMs < fromMs) {
        continue;
      }
      if (toMs != null && eventMs >= toMs) {
        continue;
      }
      const removed = isTruthyDeleted(curr.IsDelete);

      for (const field of BANK_FIELDS) {
        // Soft-delete: emit every catalogue field (SP includes all REMOVED rows).
        // Troubleshooter table shows last value in Old / NOT SET in New.
        if (removed) {
          const lastValue = fieldValue(curr, field);
          fieldRows.push({
            timeStamp,
            editorEmployeeId: curr.LastUpdatedBy,
            change: {
              field: field.label,
              oldValue: displayOrNotSet(lastValue),
              newValue: "NOT SET",
              changeType: "REMOVED",
            },
          });
          continue;
        }

        const newValue = fieldValue(curr, field);
        const oldValue = prev ? fieldValue(prev, field) : "";

        if (newValue === oldValue) {
          continue;
        }
        if (!prev && newValue === "") {
          continue;
        }

        fieldRows.push({
          timeStamp,
          editorEmployeeId: curr.LastUpdatedBy,
          change: {
            field: field.label,
            oldValue: displayOrNotSet(oldValue),
            newValue: displayOrNotSet(newValue),
            changeType: inferType(oldValue, newValue, false),
          },
        });
      }
    }
  }

  return groupFieldChangesIntoEvents("Bank Details", fieldRows, input.editors);
}

export async function gatherBankEditorIds(
  db: HrmsDb,
  input: { employeeId: number; from: Date | null; toExclusive: Date | null },
): Promise<number[]> {
  try {
    const rows =
      input.from && input.toExclusive
        ? await db.$queryRaw<Array<{ LastUpdatedBy: number | null }>>`
            SELECT DISTINCT LastUpdatedBy
            FROM dbo.TEmployeeBankDetails_History
            WHERE EmployeeId = ${input.employeeId}
              AND ISNULL(Show, 0) = 1
              AND UpdatedDateUtc >= ${input.from}
              AND UpdatedDateUtc < ${input.toExclusive}
          `
        : await db.$queryRaw<Array<{ LastUpdatedBy: number | null }>>`
            SELECT DISTINCT LastUpdatedBy
            FROM dbo.TEmployeeBankDetails_History
            WHERE EmployeeId = ${input.employeeId}
              AND ISNULL(Show, 0) = 1
          `;
    return rows
      .map((row) => row.LastUpdatedBy)
      .filter((id): id is number => typeof id === "number" && id > 0);
  } catch {
    return [];
  }
}
