import { PrismaMssql } from "@prisma/adapter-mssql";
import { PrismaClient } from "../generated/prisma/client";
import { type HrmsDbConfig, toMssqlConfig } from "./config";

export type HrmsDb = PrismaClient;

export function createHrmsDb(config: HrmsDbConfig): HrmsDb {
  const mssql = toMssqlConfig(config);
  const adapter = new PrismaMssql(mssql);
  return new PrismaClient({ adapter });
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
