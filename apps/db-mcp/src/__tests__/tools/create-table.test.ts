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

describe('db_create_table', () => {
  const databases: SqliteTestDatabase[] = [];

  afterEach(() => {
    while (databases.length > 0) {
      databases.pop()?.cleanup();
    }
  });

  it('creates a table through the MCP tool surface', async () => {
    const db = createSqliteTestDatabase('PRAGMA foreign_keys = ON;');
    databases.push(db);

    const session = await connectClientAndServer(db.config);

    try {
      const result = await session.client.callTool({
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

      expect(result.isError).toBeFalsy();
      expect(db.query<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'audit_log'")).toHaveLength(1);
    } finally {
      await session.close();
    }
  });
});
