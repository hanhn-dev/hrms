import { afterEach, describe, expect, it } from 'vitest';

import { createTable } from '../../mutations/create-table.js';
import { createSqliteTestDatabase, type SqliteTestDatabase } from '../sqliteTestDb.js';

describe('createTable', () => {
  const databases: SqliteTestDatabase[] = [];

  afterEach(() => {
    while (databases.length > 0) {
      databases.pop()?.cleanup();
    }
  });

  it('creates a new SQLite table and reports the executed SQL', async () => {
    const db = createSqliteTestDatabase('PRAGMA foreign_keys = ON;');
    databases.push(db);

    const result = await createTable(db.config, {
      schema: 'main',
      name: 'audit_log',
      columns: [
        { name: 'id', dataType: 'INTEGER', nullable: false, primaryKey: true },
        { name: 'message', dataType: 'TEXT', nullable: false },
      ],
      primaryKey: ['id'],
      ifNotExists: false,
    });

    expect(result.ok).toBe(true);
    expect(result.sql[0]).toContain('CREATE TABLE');
    const tables = db.query<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'audit_log'");
    expect(tables).toHaveLength(1);
  });
});
