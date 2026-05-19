import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { afterEach, describe, expect, it } from 'vitest';

import { createServer } from '../../server.js';
import { createSqliteTestDatabase, type SqliteTestDatabase } from '../sqliteTestDb.js';

async function connectClientAndServer(config: Parameters<typeof createServer>[0]) {
  const server = createServer(config);
  const client = new Client({ name: 'test-client', version: '1.0.0' });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

  return {
    client,
    server,
    close: async () => {
      await Promise.all([client.close(), server.close()]);
    },
  };
}

describe('db_add_relationship', () => {
  const databases: SqliteTestDatabase[] = [];

  afterEach(() => {
    while (databases.length > 0) {
      databases.pop()?.cleanup();
    }
  });

  it('adds a foreign-key relationship through the MCP tool surface', async () => {
    const db = createSqliteTestDatabase(`
      PRAGMA foreign_keys = ON;
      CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT NOT NULL);
      CREATE TABLE posts (id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL, title TEXT NOT NULL);
    `);
    databases.push(db);

    const session = await connectClientAndServer(db.config);

    try {
      const result = await session.client.callTool({
        name: 'db_add_relationship',
        arguments: {
          fromSchema: 'main',
          fromTable: 'posts',
          fromColumn: 'user_id',
          toSchema: 'main',
          toTable: 'users',
          toColumn: 'id',
          constraintName: 'fk_posts_users',
          onDelete: 'cascade',
        },
      });

      expect(result.isError).toBeFalsy();
      expect(db.query<{ table: string; from: string; to: string }>("PRAGMA foreign_key_list('posts')")).toHaveLength(1);
    } finally {
      await session.close();
    }
  });

  it('returns a structured missing-object result when the target table does not exist', async () => {
    const db = createSqliteTestDatabase(`
      PRAGMA foreign_keys = ON;
      CREATE TABLE posts (id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL, title TEXT NOT NULL);
    `);
    databases.push(db);

    const session = await connectClientAndServer(db.config);

    try {
      const result = await session.client.callTool({
        name: 'db_add_relationship',
        arguments: {
          fromSchema: 'main',
          fromTable: 'posts',
          fromColumn: 'user_id',
          toSchema: 'main',
          toTable: 'users',
          toColumn: 'id',
          constraintName: 'fk_posts_users',
          onDelete: 'cascade',
        },
      });
      const content = result.content as Array<{ type: 'text'; text: string }>;
      const parsed = JSON.parse(content[0]!.text) as { ok: boolean; error: string | null; operation: string };

      expect(result.isError).toBeFalsy();
      expect(parsed.ok).toBe(false);
      expect(parsed.operation).toBe('db_add_relationship');
      expect(parsed.error).toBeTruthy();
    } finally {
      await session.close();
    }
  });
});
