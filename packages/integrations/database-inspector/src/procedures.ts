import {
  getMySqlStoredProcedureDependencies,
  getMySqlStoredProcedureScript,
} from './engines/mysql.js';
import {
  getOracleStoredProcedureDependencies,
  getOracleStoredProcedureScript,
} from './engines/oracle.js';
import {
  getPostgresStoredProcedureDependencies,
  getPostgresStoredProcedureScript,
} from './engines/postgres.js';
import {
  getSqliteStoredProcedureDependencies,
  getSqliteStoredProcedureScript,
} from './engines/sqlite.js';
import {
  getSqlServerStoredProcedureDependencies,
  getSqlServerStoredProcedureScript,
} from './engines/sqlserver.js';
import type { DatabaseMcpConfig, StoredProcedureInsight, StoredProcedureRequest } from './types.js';

export async function getStoredProcedureScript(
  config: DatabaseMcpConfig,
  request: StoredProcedureRequest,
): Promise<StoredProcedureInsight> {
  if (config.engine === 'sqlserver') {
    return getSqlServerStoredProcedureScript(config, request);
  }

  if (config.engine === 'postgres') {
    return getPostgresStoredProcedureScript(config, request);
  }

  if (config.engine === 'mysql') {
    return getMySqlStoredProcedureScript(config, request);
  }

  if (config.engine === 'oracle') {
    return getOracleStoredProcedureScript(config, request);
  }

  return getSqliteStoredProcedureScript(config, request);
}

export async function getStoredProcedureDependencies(
  config: DatabaseMcpConfig,
  request: StoredProcedureRequest,
): Promise<StoredProcedureInsight> {
  if (config.engine === 'sqlserver') {
    return getSqlServerStoredProcedureDependencies(config, request);
  }

  if (config.engine === 'postgres') {
    return getPostgresStoredProcedureDependencies(config, request);
  }

  if (config.engine === 'mysql') {
    return getMySqlStoredProcedureDependencies(config, request);
  }

  if (config.engine === 'oracle') {
    return getOracleStoredProcedureDependencies(config, request);
  }

  return getSqliteStoredProcedureDependencies(config, request);
}