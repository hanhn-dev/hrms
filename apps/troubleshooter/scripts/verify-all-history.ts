import {
  createHrmsDb,
  loadEmployeeHistoryChanges,
  resolveEmployee,
} from "@hrms/db";

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
    if (!identity) throw new Error("missing employee");

    const result = await loadEmployeeHistoryChanges(db, {
      employerId: 10,
      employeeId: identity.employeeId,
      type: "History",
      pageNumber: 1,
      pageSize: 50,
    });
    console.log("total", result.totalItems);
    const bySection = new Map<string, number>();
    for (const e of result.data) {
      bySection.set(e.section, (bySection.get(e.section) ?? 0) + 1);
      console.log(
        e.timeStamp,
        "|",
        e.section,
        "|",
        e.editor.name,
        "|",
        e.changes.length,
        "fields:",
        e.changes
          .slice(0, 4)
          .map((c) => c.field)
          .join(","),
      );
    }
    console.log("bySection", Object.fromEntries(bySection));

    const cols = await db.$queryRaw<Array<{ COLUMN_NAME: string }>>`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'TEmployeeInfoHistory'
      ORDER BY ORDINAL_POSITION
    `;
    console.log(
      "infoHistory cols",
      cols.map((c) => c.COLUMN_NAME).join(", "),
    );

    const info = await db.$queryRaw<Record<string, unknown>[]>`
      SELECT TOP 15 *
      FROM dbo.TEmployeeInfoHistory
      WHERE EmployeeId = ${identity.employeeId}
      ORDER BY HistoryTransId DESC
    `;
    console.log(
      "info rows",
      info.map((r) => ({
        id: r.HistoryTransId ?? r.HistoryTransID,
        ModifiedDateUtcTime: r.ModifiedDateUtcTime,
        ModifiedDate: r.ModifiedDate,
        ModifiedUtcDate: r.ModifiedUtcDate,
        UpdatedDateUtcTime: r.UpdatedDateUtcTime,
        ModifiedBy: r.ModifiedBy,
        ReportsTo: r.ReportsTo,
        BusinessUnitId: r.BusinessUnitId,
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
