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

describe('db_get_object_details', () => {
  const databases: SqliteTestDatabase[] = [];

  afterEach(() => {
    while (databases.length > 0) {
      databases.pop()?.cleanup();
    }
  });

  it('returns SQLite table details through the MCP tool surface', async () => {
    const db = createSqliteTestDatabase('CREATE TABLE audit_log (id INTEGER PRIMARY KEY, message TEXT NOT NULL);');
    databases.push(db);

    const session = await connectClientAndServer(db.config);

    try {
      const result = await session.client.callTool({
        name: 'db_get_object_details',
        arguments: { schema: 'main', name: 'audit_log', kind: 'table', includeDependents: true },
      });
      const content = result.content as Array<{ type: 'text'; text: string }>;
      const parsed = JSON.parse(content[0]!.text) as { columns: Array<{ name: string }> };

      expect(result.isError).toBeFalsy();
      expect(parsed.columns.map((column) => column.name)).toEqual(['id', 'message']);
    } finally {
      await session.close();
    }
  });
});
