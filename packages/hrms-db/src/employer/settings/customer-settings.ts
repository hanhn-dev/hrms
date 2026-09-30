import { Prisma } from "../../generated/prisma/client";
import type { HrmsDb } from "../../shared/client";
import { parseEmployerId } from "../../shared/ids";
import { presentColumns, presentTables } from "../../shared/objects";
import {
  CUSTOMER_SETTING_FIELDS,
  CUSTOMER_SETTING_TABLES,
  decodeSettingValue,
  splitCustomerSettingColumns,
  type CustomerSettingField,
  type CustomerSettingTable,
  type CustomerSettingUiValue,
  type MissingCustomerSettingColumn,
} from "./catalog";

const SQL_IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;

export type CustomerSettingsRow = {
  employerId: number;
  customerId: string;
  customerName: string | null;
  hasTneConfig: boolean;
  hasPayrollConfig: boolean;
  values: Record<string, CustomerSettingUiValue>;
  missingColumns: MissingCustomerSettingColumn[];
};

type RawCustomerSettingsRow = Record<string, unknown> & {
  EmployerId: number;
  CustomerId: string;
  CustName: string | null;
  HasTneConfig: boolean | number | null;
  HasPayrollConfig: boolean | number | null;
};

function sqlIdent(name: string): Prisma.Sql {
  if (!SQL_IDENT.test(name)) {
    throw new Error(`Refusing to use identifier ${name}.`);
  }
  return Prisma.raw(`[${name}]`);
}

function tableAlias(table: CustomerSettingTable): string {
  if (table === "TCustomerSettings") {
    return "Settings";
  }
  if (table === "TTNEEmployerConfiguration") {
    return "Tne";
  }
  return "Payroll";
}

function settingSelectFragments(fields: readonly CustomerSettingField[]): Prisma.Sql[] {
  return fields.map((field) => {
    const alias = tableAlias(field.table);
    return Prisma.sql`${Prisma.raw(alias)}.${sqlIdent(field.column)} AS ${sqlIdent(field.key)}`;
  });
}

export async function getCustomerSettings(
  db: HrmsDb,
  employerId: number,
): Promise<CustomerSettingsRow | null> {
  const tenantId = parseEmployerId(employerId);
  const [tables, columns] = await Promise.all([
    presentTables(db, CUSTOMER_SETTING_TABLES),
    presentColumns(
      db,
      CUSTOMER_SETTING_FIELDS.map((field) => ({
        table: field.table,
        column: field.column,
      })),
    ),
  ]);
  const split = splitCustomerSettingColumns(tables, columns);
  const fragments = settingSelectFragments(split.presentFields);
  const extraSelect =
    fragments.length > 0 ? Prisma.sql`, ${Prisma.join(fragments)}` : Prisma.empty;
  const tneFlag = split.includeTneJoin
    ? Prisma.sql`CASE WHEN Tne.EmployerID IS NULL THEN 0 ELSE 1 END`
    : Prisma.sql`CAST(0 AS int)`;
  const payrollFlag = split.includePayrollJoin
    ? Prisma.sql`CASE WHEN Payroll.Id IS NULL THEN 0 ELSE 1 END`
    : Prisma.sql`CAST(0 AS int)`;
  const tneJoin = split.includeTneJoin
    ? Prisma.sql`
    LEFT JOIN dbo.TTNEEmployerConfiguration AS Tne
        ON Tne.EmployerID = Settings.EmployerId`
    : Prisma.empty;
  const payrollJoin = split.includePayrollJoin
    ? Prisma.sql`
    LEFT JOIN dbo.TExternal_Payroll_Configuration AS Payroll
        ON Payroll.CustomerId = Settings.CustomerId`
    : Prisma.empty;
  const rows = await db.$queryRaw<RawCustomerSettingsRow[]>`
    SELECT
        Settings.EmployerId,
        Settings.CustomerId,
        Settings.CustName,
        ${tneFlag} AS HasTneConfig,
        ${payrollFlag} AS HasPayrollConfig
        ${extraSelect}
    FROM dbo.TCustomerSettings AS Settings
    ${tneJoin}
    ${payrollJoin}
    WHERE Settings.EmployerId = ${tenantId}
  `;
  const row = rows[0];
  if (!row) {
    return null;
  }
  const values: Record<string, CustomerSettingUiValue> = {};
  for (const field of split.presentFields) {
    values[field.key] = decodeSettingValue(field, row[field.key]);
  }
  return {
    employerId: Number(row.EmployerId),
    customerId: String(row.CustomerId),
    customerName: row.CustName,
    hasTneConfig: row.HasTneConfig === true || row.HasTneConfig === 1,
    hasPayrollConfig: row.HasPayrollConfig === true || row.HasPayrollConfig === 1,
    values,
    missingColumns: split.missingColumns,
  };
}
