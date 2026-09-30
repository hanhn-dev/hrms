import "server-only";
import type { DatabaseMcpConfig } from "@hrms/database-inspector";
import type { HrmsDbConfig } from "@hrms/db";
import { toMssqlConfig } from "@hrms/db";
import { cookies } from "next/headers";
import {
  ENVIRONMENT_COOKIE,
  getEnvironmentConfig,
  resolveEnvironment,
} from "./environments";

export function hrmsConfigToInspectorConfig(
  config: HrmsDbConfig,
): DatabaseMcpConfig {
  if ("connectionString" in config) {
    const mssql = toMssqlConfig(config);
    return {
      engine: "sqlserver",
      connectionString: undefined,
      host: mssql.server,
      port: mssql.port,
      database: mssql.database,
      user: mssql.user,
      password: mssql.password,
      schema: undefined,
      ssl: mssql.options.encrypt,
      trustServerCertificate: mssql.options.trustServerCertificate,
      sqlitePath: undefined,
    };
  }
  return {
    engine: "sqlserver",
    connectionString: undefined,
    host: config.server,
    port: config.port,
    database: config.database,
    user: config.user,
    password: config.password,
    schema: undefined,
    ssl: config.encrypt ?? false,
    trustServerCertificate: config.trustServerCertificate ?? true,
    sqlitePath: undefined,
  };
}

export function getInspectorConfigForEnvironment(
  env: string,
): DatabaseMcpConfig {
  return hrmsConfigToInspectorConfig(getEnvironmentConfig(env));
}

export async function getInspectorConfig(
  env?: string,
): Promise<DatabaseMcpConfig> {
  const cookieStore = await cookies();
  const resolved = env
    ? resolveEnvironment(env)
    : resolveEnvironment(cookieStore.get(ENVIRONMENT_COOKIE)?.value);
  return getInspectorConfigForEnvironment(resolved);
}
