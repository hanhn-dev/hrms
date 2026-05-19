import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { afterEach, describe, expect, it } from 'vitest';

import { createServer } from '../server.js';
import { createSqliteTestDatabase, type SqliteTestDatabase } from './sqliteTestDb.js';

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

describe('SQLite schema workflow', () => {
  const databases: SqliteTestDatabase[] = [];

  afterEach(() => {
    while (databases.length > 0) {
      databases.pop()?.cleanup();
    }
  });

  it('creates a table, alters it, and adds a relationship through the MCP server', async () => {
    const db = createSqliteTestDatabase(`
      PRAGMA foreign_keys = ON;
      CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT NOT NULL);
      CREATE TABLE posts (id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL, title TEXT NOT NULL);
    `);
    databases.push(db);

    const session = await connectClientAndServer(db.config);

    try {
      await session.client.callTool({
        name: 'db_create_table',
        arguments: {
          schema: 'main',
          name: 'audit_log',
          columns: [
            { name: 'id', dataType: 'INTEGER', nullable: false, primaryKey: true },
            { name: 'message', dataType: 'TEXT', nullable: false },
          ],
          primaryKey: ['id'],
          ifNotExists: false,
        },
      });

      await session.client.callTool({
        name: 'db_alter_table',
        arguments: {
          schema: 'main',
          name: 'audit_log',
          addColumns: [{ name: 'external_reference', dataType: 'TEXT', nullable: true }],
          alterColumns: [],
          dropColumns: [],
          addConstraints: [],
          dropConstraints: [],
        },
      });

      await session.client.callTool({
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

      expect(db.query<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'audit_log'")).toHaveLength(1);
      expect((db.query<{ name: string }>("PRAGMA table_info('audit_log')") as Array<{ name: string }>).map((column) => column.name)).toContain('external_reference');
      expect(db.query<{ table: string }>("PRAGMA foreign_key_list('posts')")).toHaveLength(1);
    } finally {
      await session.close();
    }
  });
});
