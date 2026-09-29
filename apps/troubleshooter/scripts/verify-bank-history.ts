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
      section: "Bank Details",
      pageNumber: 1,
      pageSize: 10,
    });
    console.log(
      JSON.stringify(
        result.data.map((e) => ({
          timeStamp: e.timeStamp,
          editor: e.editor,
          section: e.section,
          changes: e.changes.map((c) => ({
            field: c.field,
            changeType: c.changeType,
            oldValue: c.oldValue,
            newValue: c.newValue,
          })),
        })),
        null,
        2,
      ),
    );
    console.log("total", result.totalItems);
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
