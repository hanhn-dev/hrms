import { afterEach, describe, expect, it } from 'vitest';

import { getCatalog } from '../catalog.js';
import { getObjectDetails } from '../object-details.js';
import { createSqliteTestDatabase, type SqliteTestDatabase } from './sqliteTestDb.js';

const seedSql = `
  PRAGMA foreign_keys = ON;
  CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    email TEXT NOT NULL UNIQUE
  );
  CREATE TABLE posts (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`;

describe('SQLite catalog services', () => {
  const databases: SqliteTestDatabase[] = [];

  afterEach(() => {
    while (databases.length > 0) {
      databases.pop()?.cleanup();
    }
  });

  it('returns tables and relationships from the SQLite catalog', async () => {
    const db = createSqliteTestDatabase(seedSql);
    databases.push(db);

    const catalog = await getCatalog(db.config, { includeRelationships: true });

    expect(catalog.engine).toBe('sqlite');
    expect(catalog.schemas).toEqual(['main']);
    expect(catalog.objects.map((object) => object.name)).toEqual(['posts', 'users']);
    expect(catalog.relationships).toHaveLength(1);
    expect(catalog.relationships[0]?.label).toContain('posts.user_id');
  });

  it('returns column and relationship details for a schema-qualified table', async () => {
    const db = createSqliteTestDatabase(seedSql);
    databases.push(db);

    const details = await getObjectDetails(db.config, {
      schema: 'main',
      name: 'posts',
      kind: 'table',
      includeDependents: true,
    });

    expect(details.object.name).toBe('posts');
    expect(details.columns.map((column) => column.name)).toEqual(['id', 'user_id', 'title']);
    expect(details.relationships).toHaveLength(1);
    expect(details.dependencies).toEqual([]);
    expect(details.dependents).toEqual([]);
  });
});
