import { createHrmsDb, resolveEmployee } from "@hrms/db";

function cfg() {
  const connectionString = process.env.TROUBLESHOOTER_DB_DEV_CONNECTION_STRING;
  if (connectionString) return { connectionString };
  return {
    server: process.env.TROUBLESHOOTER_DB_DEV_HOST ?? process.env.TROUBLESHOOTER_DB_HOST!,
    database: process.env.TROUBLESHOOTER_DB_DEV_DATABASE ?? process.env.TROUBLESHOOTER_DB_DATABASE!,
    user: process.env.TROUBLESHOOTER_DB_DEV_USER ?? process.env.TROUBLESHOOTER_DB_USER!,
    password: process.env.TROUBLESHOOTER_DB_DEV_PASSWORD ?? process.env.TROUBLESHOOTER_DB_PASSWORD!,
    encrypt: process.env.TROUBLESHOOTER_DB_DEV_ENCRYPT === "true",
    trustServerCertificate:
      process.env.TROUBLESHOOTER_DB_DEV_TRUST_SERVER_CERTIFICATE !== "false",
  };
}

async function main() {
  const db = createHrmsDb(cfg());
  try {
    const identity = await resolveEmployee(db, 10, "00006");
    console.log("identity", identity?.employeeId);
    if (!identity) return;

    const cols = await db.$queryRaw<Array<{ COLUMN_NAME: string; DATA_TYPE: string }>>`
      SELECT COLUMN_NAME, DATA_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'TEmployeeBankDetails_History'
      ORDER BY ORDINAL_POSITION
    `;
    console.log(
      "bank history cols",
      cols.map((c) => c.COLUMN_NAME).join(", "),
    );

    const rows = await db.$queryRaw<Record<string, unknown>[]>`
      SELECT TOP 20 *
      FROM dbo.TEmployeeBankDetails_History
      WHERE EmployeeID = ${identity.employeeId} OR EmployeeId = ${identity.employeeId}
      ORDER BY UpdatedDateUtc DESC
    `.catch(async () => {
      return db.$queryRaw<Record<string, unknown>[]>`
        SELECT TOP 20 *
        FROM dbo.TEmployeeBankDetails_History
        WHERE EmployeeID = ${identity.employeeId}
        ORDER BY TEmployeeBankDetails_HistoryID DESC
      `;
    });
    console.log(
      "sample rows",
      rows.map((r) => ({
        id: r.TEmployeeBankDetails_HistoryID ?? r.HistoryId,
        bankDetailId: r.BankDetailId,
        UpdatedDateUtc: r.UpdatedDateUtc,
        ModifiedDateUtc: r.ModifiedDateUtc,
        LastUpdatedBy: r.LastUpdatedBy,
        ModifiedBy: r.ModifiedBy,
        Isdelete: r.Isdelete ?? r.IsDelete,
        Show: r.Show,
        AccountNo: r.AccountNo,
        BankName: r.BankName,
        isDefault: r.isDefault,
      })),
    );
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
