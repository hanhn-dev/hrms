import { Prisma } from "../../generated/prisma/client";
import type { HrmsDb } from "../../shared/client";
import { parseEmployerId } from "../../shared/ids";
import {
  CUSTOMER_SETTING_FIELDS,
  decodeSettingValue,
  type CustomerSettingTable,
  type CustomerSettingUiValue,
} from "./catalog";

const SQL_IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;

export type CustomerSettingsRow = {
  employerId: number;
  customerId: string;
  customerName: string | null;
  hasTneConfig: boolean;
  hasPayrollConfig: boolean;
  values: Record<string, CustomerSettingUiValue>;
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

function settingSelectFragments(): Prisma.Sql[] {
  return CUSTOMER_SETTING_FIELDS.map((field) => {
    const alias = tableAlias(field.table);
    return Prisma.sql`${Prisma.raw(alias)}.${sqlIdent(field.column)} AS ${sqlIdent(field.key)}`;
  });
}

export async function getCustomerSettings(
  db: HrmsDb,
  employerId: number,
): Promise<CustomerSettingsRow | null> {
  const tenantId = parseEmployerId(employerId);
  const rows = await db.$queryRaw<RawCustomerSettingsRow[]>`
    SELECT
        Settings.EmployerId,
        Settings.CustomerId,
        Settings.CustName,
        CASE WHEN Tne.EmployerID IS NULL THEN 0 ELSE 1 END AS HasTneConfig,
        CASE WHEN Payroll.Id IS NULL THEN 0 ELSE 1 END AS HasPayrollConfig,
        ${Prisma.join(settingSelectFragments())}
    FROM dbo.TCustomerSettings AS Settings
    LEFT JOIN dbo.TTNEEmployerConfiguration AS Tne
        ON Tne.EmployerID = Settings.EmployerId
    LEFT JOIN dbo.TExternal_Payroll_Configuration AS Payroll
        ON Payroll.CustomerId = Settings.CustomerId
    WHERE Settings.EmployerId = ${tenantId}
  `;
  const row = rows[0];
  if (!row) {
    return null;
  }
  const values: Record<string, CustomerSettingUiValue> = {};
  for (const field of CUSTOMER_SETTING_FIELDS) {
    values[field.key] = decodeSettingValue(field, row[field.key]);
  }
  return {
    employerId: Number(row.EmployerId),
    customerId: String(row.CustomerId),
    customerName: row.CustName,
    hasTneConfig: row.HasTneConfig === true || row.HasTneConfig === 1,
    hasPayrollConfig: row.HasPayrollConfig === true || row.HasPayrollConfig === 1,
    values,
  };
}
