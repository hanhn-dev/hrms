import { Prisma } from "../../generated/prisma/client";
import type { HrmsDb } from "../../shared/client";
import { parseEmployerId, userIdSchema } from "../../shared/ids";
import {
  diffCustomerSettingPatch,
  encodeSettingValue,
  fieldsForCategory,
  parseCategoryPatch,
  requireSettingField,
  type CustomerSettingCategoryId,
  type CustomerSettingField,
  type CustomerSettingTable,
  type CustomerSettingUiValue,
} from "./catalog";
import { getCustomerSettings, type CustomerSettingsRow } from "./customer-settings";

const SQL_IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;

type Tx = Parameters<Parameters<HrmsDb["$transaction"]>[0]>[0];

export type CustomerSettingsPatchInput = {
  employerId: number;
  category: CustomerSettingCategoryId;
  patch: Record<string, unknown>;
  updatedBy: number;
};

function sqlIdent(name: string): Prisma.Sql {
  if (!SQL_IDENT.test(name)) {
    throw new Error(`Refusing to use identifier ${name}.`);
  }
  return Prisma.raw(`[${name}]`);
}

function tableName(table: CustomerSettingTable): Prisma.Sql {
  return sqlIdent(table);
}

function groupFieldsByTable(
  fields: CustomerSettingField[],
): Map<CustomerSettingTable, CustomerSettingField[]> {
  const grouped = new Map<CustomerSettingTable, CustomerSettingField[]>();
  for (const field of fields) {
    const current = grouped.get(field.table) ?? [];
    current.push(field);
    grouped.set(field.table, current);
  }
  return grouped;
}

export function previewCustomerSettingsPatch(
  current: CustomerSettingsRow,
  category: CustomerSettingCategoryId,
  patch: Record<string, unknown>,
): {
  parsed: Record<string, CustomerSettingUiValue>;
  preview: Array<Record<string, unknown>>;
} {
  const parsed = parseCategoryPatch(category, patch);
  const preview = diffCustomerSettingPatch(current.values, parsed);
  if (preview.length === 0) {
    throw new Error("No changes to save.");
  }
  return { parsed, preview };
}

export async function updateCustomerSettingsCategory(
  db: HrmsDb,
  input: CustomerSettingsPatchInput,
): Promise<CustomerSettingsRow> {
  const employerId = parseEmployerId(input.employerId);
  const updatedBy = userIdSchema.parse(input.updatedBy);
  const allowedKeys = new Set(fieldsForCategory(input.category).map((field) => field.key));

  return db.$transaction(async (tx) => {
    const current = await getCustomerSettings(tx as HrmsDb, employerId);
    if (!current) {
      throw new Error("Customer settings were not found for this employer.");
    }
    const { parsed, preview } = previewCustomerSettingsPatch(
      current,
      input.category,
      input.patch,
    );
    const changedKeys = preview.map((row) => String(row.Key));
    for (const key of changedKeys) {
      if (!allowedKeys.has(key)) {
        throw new Error(`${key} is not part of ${input.category} settings.`);
      }
    }
    const changedFields = changedKeys.map(requireSettingField);
    const grouped = groupFieldsByTable(changedFields);

    const tneFields = grouped.get("TTNEEmployerConfiguration") ?? [];
    if (tneFields.length > 0 && !current.hasTneConfig) {
      await insertTneConfig(tx, employerId, updatedBy);
    }
    const payrollFields = grouped.get("TExternal_Payroll_Configuration") ?? [];
    if (payrollFields.length > 0 && !current.hasPayrollConfig) {
      await insertPayrollConfig(tx, current.customerId, current.customerName);
    }

    for (const [table, fields] of grouped) {
      const sets = fields.map((field) => {
        const encoded = encodeSettingValue(field, parsed[field.key] ?? null);
        return Prisma.sql`${sqlIdent(field.column)} = ${encoded}`;
      });
      if (table === "TCustomerSettings") {
        await tx.$executeRaw`
          UPDATE dbo.${tableName(table)}
          SET ${Prisma.join(sets)}
          WHERE EmployerId = ${employerId}
        `;
        continue;
      }
      if (table === "TTNEEmployerConfiguration") {
        await tx.$executeRaw`
          UPDATE dbo.${tableName(table)}
          SET
              ${Prisma.join(sets)},
              UpdatedBy = ${updatedBy},
              UpdatedDate = GETUTCDATE()
          WHERE EmployerID = ${employerId}
        `;
        continue;
      }
      await tx.$executeRaw`
        UPDATE dbo.${tableName(table)}
        SET
            ${Prisma.join(sets)},
            UpdatedAt = GETDATE()
        WHERE CustomerId = ${current.customerId}
      `;
    }

    const after = await getCustomerSettings(tx as HrmsDb, employerId);
    if (!after) {
      throw new Error("Customer settings were not found after update.");
    }
    return after;
  });
}

async function insertTneConfig(
  tx: Tx,
  employerId: number,
  updatedBy: number,
): Promise<void> {
  await tx.$executeRaw`
    INSERT INTO dbo.TTNEEmployerConfiguration (
        EmployerID,
        IsSingleApprovalForTravelRequest,
        SkipAcknowledgmentByAccountant,
        IsActive,
        CreatedBy,
        CreatedDate,
        RequestPurposeMandatory,
        ApproverCommentMandatory,
        RejectCommentMandatory,
        SkipAmountPaid,
        AdvanceEnabled,
        CostEstimationEnable
    )
    VALUES (
        ${employerId},
        0,
        0,
        1,
        ${updatedBy},
        GETUTCDATE(),
        1,
        1,
        1,
        0,
        0,
        0
    )
  `;
}

async function insertPayrollConfig(
  tx: Tx,
  customerId: string,
  customerName: string | null,
): Promise<void> {
  const name = customerName?.trim() ? customerName.trim() : customerId;
  await tx.$executeRaw`
    INSERT INTO dbo.TExternal_Payroll_Configuration (
        CustomerId,
        CustomerName,
        IsEnabled,
        CreatedAt,
        UpdatedAt
    )
    VALUES (
        ${customerId},
        ${name},
        0,
        GETDATE(),
        GETDATE()
    )
  `;
}
