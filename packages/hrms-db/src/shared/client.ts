import { PrismaMssql } from "@prisma/adapter-mssql";
import { PrismaClient } from "../generated/prisma/client";
import { type HrmsDbConfig, toMssqlConfig } from "./config";
import { noteQueryScriptFromCall, queryCaptureGeneration } from "./query-script";

export type HrmsDb = PrismaClient;

export function createHrmsDb(config: HrmsDbConfig): HrmsDb {
  const mssql = toMssqlConfig(config);
  const adapter = new PrismaMssql(mssql);
  return instrumentQueryScript(new PrismaClient({ adapter }));
}

function instrumentQueryScript(client: HrmsDb): HrmsDb {
  const queryRaw = client.$queryRaw.bind(client);
  const queryRawUnsafe = client.$queryRawUnsafe.bind(client);
  client.$queryRaw = ((query: unknown, ...values: unknown[]) => {
    noteQueryScriptFromCall(query, values);
    return queryRaw(query as TemplateStringsArray, ...values);
  }) as HrmsDb["$queryRaw"];
  client.$queryRawUnsafe = ((query: string, ...values: unknown[]) => {
    noteQueryScriptFromCall(query, values);
    return queryRawUnsafe(query, ...values);
  }) as HrmsDb["$queryRawUnsafe"];
  (client as HrmsDb & { queryCaptureGeneration?: number }).queryCaptureGeneration =
    queryCaptureGeneration;
  return client;
}

export async function checkDatabase(
  db: HrmsDb,
): Promise<{ ok: true; database: string }> {
  const rows = await db.$queryRaw<Array<{ name: string }>>`
    SELECT DB_NAME() AS name
  `;
  const database = rows[0]?.name;
  if (!database) {
    throw new Error("Database health check returned no name.");
  }
  return { ok: true, database };
}
