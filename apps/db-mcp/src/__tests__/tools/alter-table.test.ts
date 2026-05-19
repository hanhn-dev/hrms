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

describe('db_alter_table', () => {
  const databases: SqliteTestDatabase[] = [];

  afterEach(() => {
    while (databases.length > 0) {
      databases.pop()?.cleanup();
    }
  });

  it('adds a column through the MCP tool surface', async () => {
    const db = createSqliteTestDatabase('CREATE TABLE audit_log (id INTEGER PRIMARY KEY);');
    databases.push(db);

    const session = await connectClientAndServer(db.config);

    try {
      const result = await session.client.callTool({
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

      expect(result.isError).toBeFalsy();
      expect((db.query<{ name: string }>("PRAGMA table_info('audit_log')") as Array<{ name: string }>).map((column) => column.name)).toContain('external_reference');
    } finally {
      await session.close();
    }
  });

  it('returns a structured unsupported result when SQLite receives an unsupported alter request', async () => {
    const db = createSqliteTestDatabase('CREATE TABLE audit_log (id INTEGER PRIMARY KEY, message TEXT NOT NULL);');
    databases.push(db);

    const session = await connectClientAndServer(db.config);

    try {
      const result = await session.client.callTool({
        name: 'db_alter_table',
        arguments: {
          schema: 'main',
          name: 'audit_log',
          addColumns: [],
          alterColumns: [],
          dropColumns: ['message'],
          addConstraints: [],
          dropConstraints: [],
        },
      });
      const content = result.content as Array<{ type: 'text'; text: string }>;
      const parsed = JSON.parse(content[0]!.text) as { ok: boolean; error: string | null; operation: string };

      expect(result.isError).toBeFalsy();
      expect(parsed.ok).toBe(false);
      expect(parsed.operation).toBe('db_alter_table');
      expect(parsed.error).toContain('SQLite currently supports table rename and add-column operations only');
    } finally {
      await session.close();
    }
  });
});
