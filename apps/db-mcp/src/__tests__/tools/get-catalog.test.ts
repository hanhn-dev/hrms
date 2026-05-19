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

describe('db_get_catalog', () => {
  const databases: SqliteTestDatabase[] = [];

  afterEach(() => {
    while (databases.length > 0) {
      databases.pop()?.cleanup();
    }
  });

  it('returns the SQLite catalog through the MCP tool surface', async () => {
    const db = createSqliteTestDatabase(`
      PRAGMA foreign_keys = ON;
      CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT NOT NULL);
      CREATE TABLE posts (
        id INTEGER PRIMARY KEY,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `);
    databases.push(db);

    const session = await connectClientAndServer(db.config);

    try {
      const result = await session.client.callTool({
        name: 'db_get_catalog',
        arguments: { includeRelationships: true },
      });
      const content = result.content as Array<{ type: 'text'; text: string }>;
      const parsed = JSON.parse(content[0]!.text) as { objects: Array<{ name: string }>; relationships: unknown[] };

      expect(result.isError).toBeFalsy();
      expect(parsed.objects.map((object) => object.name)).toEqual(['posts', 'users']);
      expect(parsed.relationships).toHaveLength(1);
    } finally {
      await session.close();
    }
  });
});
