import { afterEach, describe, expect, it } from 'vitest';

import { addRelationship } from '../../mutations/add-relationship.js';
import { createSqliteTestDatabase, type SqliteTestDatabase } from '../sqliteTestDb.js';

const seedSql = `
  PRAGMA foreign_keys = ON;
  CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    email TEXT NOT NULL
  );
  CREATE TABLE posts (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL
  );
`;

describe('addRelationship', () => {
  const databases: SqliteTestDatabase[] = [];

  afterEach(() => {
    while (databases.length > 0) {
      databases.pop()?.cleanup();
    }
  });

  it('adds a foreign-key relationship to an existing SQLite table', async () => {
    const db = createSqliteTestDatabase(seedSql);
    databases.push(db);

    const result = await addRelationship(db.config, {
      fromSchema: 'main',
      fromTable: 'posts',
      fromColumn: 'user_id',
      toSchema: 'main',
      toTable: 'users',
      toColumn: 'id',
      constraintName: 'fk_posts_users',
      onDelete: 'cascade',
      onUpdate: 'noAction',
    });

    expect(result.ok).toBe(true);
    const foreignKeys = db.query<{ table: string; from: string; to: string }>("PRAGMA foreign_key_list('posts')") as Array<{
      table: string;
      from: string;
      to: string;
    }>;
    expect(foreignKeys).toHaveLength(1);
    expect(foreignKeys[0]).toMatchObject({ table: 'users', from: 'user_id', to: 'id' });
  });
});
