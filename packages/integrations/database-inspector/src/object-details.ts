import type { DatabaseMcpConfig, DatabaseObjectDetails, ObjectDetailsRequest } from './types.js';
import { getMySqlObjectDetails } from './engines/mysql.js';
import { getOracleObjectDetails } from './engines/oracle.js';
import { getPostgresObjectDetails } from './engines/postgres.js';
import { getSqliteObjectDetails } from './engines/sqlite.js';
import { getSqlServerObjectDetails } from './engines/sqlserver.js';

export async function getObjectDetails(
  config: DatabaseMcpConfig,
  request: ObjectDetailsRequest,
): Promise<DatabaseObjectDetails> {
  if (config.engine === 'sqlserver') {
    return getSqlServerObjectDetails(config, request);
  }

  if (config.engine === 'postgres') {
    return getPostgresObjectDetails(config, request);
  }

  if (config.engine === 'mysql') {
    return getMySqlObjectDetails(config, request);
  }

  if (config.engine === 'oracle') {
    return getOracleObjectDetails(config, request);
  }

  return getSqliteObjectDetails(config, request);
}
