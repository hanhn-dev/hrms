import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { describe, expect, it } from 'vitest';

import type { DatabaseMcpConfig } from '@hrms/database-inspector';

import { createServer } from '../server.js';

const config: DatabaseMcpConfig = {
  engine: 'sqlite',
  connectionString: undefined,
  host: undefined,
  port: undefined,
  database: undefined,
  user: undefined,
  password: undefined,
  schema: undefined,
  ssl: false,
  trustServerCertificate: false,
  sqlitePath: ':memory:',
};

async function connectClientAndServer() {
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

describe('createServer', () => {
  it('registers the shipped db-mcp tools during server startup', async () => {
    const session = await connectClientAndServer();

    try {
      const response = await session.client.listTools();

      expect(response.tools.map((tool) => tool.name)).toEqual([
        'db_get_catalog',
        'db_get_object_details',
        'db_create_table',
        'db_alter_table',
        'db_add_relationship',
        'db_get_stored_procedure_script',
        'db_get_stored_procedure_dependencies',
      ]);
    } finally {
      await session.close();
    }
  });
});
