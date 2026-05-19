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

describe('db_get_stored_procedure_script', () => {
  const databases: SqliteTestDatabase[] = [];

  afterEach(() => {
    while (databases.length > 0) {
      databases.pop()?.cleanup();
    }
  });

  it('returns the SQLite unsupported stored-procedure script response through the MCP tool surface', async () => {
    const db = createSqliteTestDatabase('PRAGMA foreign_keys = ON;');
    databases.push(db);

    const session = await connectClientAndServer(db.config);

    try {
      const result = await session.client.callTool({
        name: 'db_get_stored_procedure_script',
        arguments: {
          schema: 'main',
          name: 'sync_users',
        },
      });
      const content = result.content as Array<{ type: 'text'; text: string }>;
      const parsed = JSON.parse(content[0]!.text) as { script: string | null; scriptUnavailableReason: string | null };

      expect(result.isError).toBeFalsy();
      expect(parsed.script).toBeNull();
      expect(parsed.scriptUnavailableReason).toContain('SQLite does not expose stored procedures');
    } finally {
      await session.close();
    }
  });
});