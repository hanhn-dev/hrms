import { normalizeErrorMessage } from '@hrms/database-inspector';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { loadConfig } from './config.js';
import { createServer } from './server.js';

async function main(): Promise<void> {
  const config = loadConfig();
  const server = createServer(config);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error: unknown) => {
  process.stderr.write(`Fatal error: ${normalizeErrorMessage(error, 'Unknown fatal error.')}\n`);
  process.exit(1);
});
