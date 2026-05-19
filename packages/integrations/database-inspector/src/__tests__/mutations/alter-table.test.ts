import { afterEach, describe, expect, it } from 'vitest';

import { alterTable } from '../../mutations/alter-table.js';
import { createSqliteTestDatabase, type SqliteTestDatabase } from '../sqliteTestDb.js';

describe('alterTable', () => {
  const databases: SqliteTestDatabase[] = [];

  afterEach(() => {
    while (databases.length > 0) {
      databases.pop()?.cleanup();
    }
  });

  it('adds a new nullable column to an existing SQLite table', async () => {
    const db = createSqliteTestDatabase('CREATE TABLE audit_log (id INTEGER PRIMARY KEY);');
    databases.push(db);

    const result = await alterTable(db.config, {
      schema: 'main',
      name: 'audit_log',
      renameTo: undefined,
      addColumns: [{ name: 'external_reference', dataType: 'TEXT', nullable: true }],
      alterColumns: [],
      dropColumns: [],
      addConstraints: [],
      dropConstraints: [],
    });

    expect(result.ok).toBe(true);
    expect(result.sql[0]).toContain('ADD COLUMN');
    const columns = db.query<{ name: string }>("PRAGMA table_info('audit_log')") as Array<{ name: string }>;
    expect(columns.map((column) => column.name)).toContain('external_reference');
  });
});
