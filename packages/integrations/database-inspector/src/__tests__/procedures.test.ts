import { afterEach, describe, expect, it } from 'vitest';

import { getStoredProcedureDependencies, getStoredProcedureScript } from '../procedures.js';
import { createSqliteTestDatabase, type SqliteTestDatabase } from './sqliteTestDb.js';

describe('stored procedure services', () => {
  const databases: SqliteTestDatabase[] = [];

  afterEach(() => {
    while (databases.length > 0) {
      databases.pop()?.cleanup();
    }
  });

  it('returns an unsupported script response for SQLite', async () => {
    const db = createSqliteTestDatabase('PRAGMA foreign_keys = ON;');
    databases.push(db);

    const insight = await getStoredProcedureScript(db.config, {
      schema: 'main',
      name: 'sync_users',
    });

    expect(insight.schema).toBe('main');
    expect(insight.name).toBe('sync_users');
    expect(insight.script).toBeNull();
    expect(insight.scriptUnavailableReason).toContain('SQLite does not expose stored procedures');
    expect(insight.warnings).toContain('Stored procedure inspection is unsupported for SQLite.');
  });

  it('returns an unsupported dependency response for SQLite', async () => {
    const db = createSqliteTestDatabase('PRAGMA foreign_keys = ON;');
    databases.push(db);

    const insight = await getStoredProcedureDependencies(db.config, {
      schema: 'main',
      name: 'sync_users',
      includeDependents: true,
    });

    expect(insight.dependencies).toEqual([]);
    expect(insight.dependents).toEqual([]);
    expect(insight.scriptUnavailableReason).toContain('SQLite does not expose stored procedures');
    expect(insight.warnings).toContain('Stored procedure dependency inspection is unsupported for SQLite.');
  });
});