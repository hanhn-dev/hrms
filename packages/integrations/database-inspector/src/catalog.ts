import type { CatalogQuery, DatabaseCatalog, DatabaseMcpConfig } from './types.js';
import { getMySqlCatalog } from './engines/mysql.js';
import { getOracleCatalog } from './engines/oracle.js';
import { getPostgresCatalog } from './engines/postgres.js';
import { getSqliteCatalog } from './engines/sqlite.js';
import { getSqlServerCatalog } from './engines/sqlserver.js';

export async function getCatalog(config: DatabaseMcpConfig, query: CatalogQuery = {}): Promise<DatabaseCatalog> {
  if (config.engine === 'sqlserver') {
    return getSqlServerCatalog(config, query);
  }

  if (config.engine === 'postgres') {
    return getPostgresCatalog(config, query);
  }

  if (config.engine === 'mysql') {
    return getMySqlCatalog(config, query);
  }

  if (config.engine === 'oracle') {
    return getOracleCatalog(config, query);
  }

  return getSqliteCatalog(config, query);
}
