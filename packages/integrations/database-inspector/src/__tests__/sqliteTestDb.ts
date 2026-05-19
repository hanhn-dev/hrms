import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import type { DatabaseMcpConfig } from '../types.js';

export interface SqliteTestDatabase {
  readonly filePath: string;
  readonly config: DatabaseMcpConfig;
  run(sql: string): void;
  query<T>(sql: string): T[];
  close(): void;
  cleanup(): void;
}

export function createSqliteTestDatabase(seedSql: string): SqliteTestDatabase {
  const baseDir = mkdtempSync(path.join(tmpdir(), 'hrms-db-mcp-'));
  const filePath = path.join(baseDir, `${randomUUID()}.sqlite`);
  const database = new DatabaseSync(filePath, { open: true, readOnly: false });
  database.exec(seedSql);
  database.close();

  return {
    filePath,
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
    run(sql: string) {
      const connection = new DatabaseSync(filePath, { open: true, readOnly: false });
      try {
        connection.exec(sql);
      } finally {
        connection.close();
      }
    },
    query<T>(sql: string): T[] {
      const connection = new DatabaseSync(filePath, { open: true, readOnly: true });
      try {
        return connection.prepare(sql).all() as T[];
      } finally {
        connection.close();
      }
    },
    close() {
      // No persistent connection to close.
    },
    cleanup() {
      rmSync(baseDir, { recursive: true, force: true });
    },
  };
}
