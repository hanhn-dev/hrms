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
  executeSqlServerStoredProcedure,
  getSqlServerStoredProcedureDependencies,
  getSqlServerStoredProcedureScript,
} from './engines/sqlserver.js';
import type {
  DatabaseEngine,
  DatabaseMcpConfig,
  ExecuteStoredProcedureRequest,
  StoredProcedureExecutionResult,
  StoredProcedureInsight,
  StoredProcedureRequest,
} from './types.js';

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

export async function executeStoredProcedure(
  config: DatabaseMcpConfig,
  request: ExecuteStoredProcedureRequest,
): Promise<StoredProcedureExecutionResult> {
  if (config.engine === 'sqlserver') {
    return executeSqlServerStoredProcedure(config, request);
  }

  return unsupportedStoredProcedureExecution(config.engine, request);
}

function unsupportedStoredProcedureExecution(
  engine: DatabaseEngine,
  request: ExecuteStoredProcedureRequest,
): StoredProcedureExecutionResult {
  const message = `Operation db_execute_stored_procedure is not implemented for ${engine}.`;

  return {
    ok: false,
    operation: 'db_execute_stored_procedure',
    engine,
    affectedObjects: [`${request.schema}.${request.name}`],
    sql: [],
    message,
    warnings: [],
    error: message,
    boundParameters: [],
    unmatchedPayloadKeys: [],
    omittedParameters: [],
    dryRun: request.dryRun === true,
    recordsets: null,
    output: null,
    returnValue: null,
    rowsAffected: null,
  };
}