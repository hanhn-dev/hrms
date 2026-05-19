import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import type { DatabaseMcpConfig } from '@hrms/database-inspector';

export interface SqliteTestDatabase {
  readonly config: DatabaseMcpConfig;
  query<T>(sql: string): T[];
  cleanup(): void;
}

export function createSqliteTestDatabase(seedSql: string): SqliteTestDatabase {
  const baseDir = mkdtempSync(path.join(tmpdir(), 'hrms-db-mcp-app-'));
  const filePath = path.join(baseDir, `${randomUUID()}.sqlite`);
  const database = new DatabaseSync(filePath, { open: true, readOnly: false });
  database.exec(seedSql);
  database.close();

  return {
    config: {
      engine: 'sqlite',
      connectionString: undefined,
      host: undefined,
      port: undefined,
      database: undefined,
      user: undefined,
      password: undefined,
      schema: 'main',
      ssl: false,
      trustServerCertificate: false,
      sqlitePath: filePath,
    },
    query<T>(sql: string): T[] {
      const connection = new DatabaseSync(filePath, { open: true, readOnly: true });
      try {
        return connection.prepare(sql).all() as T[];
      } finally {
        connection.close();
      }
    },
    cleanup() {
      rmSync(baseDir, { recursive: true, force: true });
    },
  };
}
