import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { AzureDevOpsClient, getWorkItem, listWorkItems, queryWorkItems } from '@hrms/azure-devops';
import type { AzureDevOpsConfig } from '@hrms/azure-devops';
import { z } from 'zod';

type TextContent = { type: 'text'; text: string };
type ToolResult = { content: TextContent[]; isError?: boolean };

/**
 * Thin cast that bypasses MCP SDK's ToolCallback<Args> conditional type.
 * That type uses z.objectOutputType<Args, ZodTypeAny> which causes TS2589
 * ("Type instantiation is excessively deep") in strict mode with complex schemas.
 * Runtime behaviour is identical — the SDK validates inputs via the Zod schema.
 */
function registerTool(
  server: McpServer,
  name: string,
  description: string,
  schema: Record<string, z.ZodTypeAny>,
  cb: (args: Record<string, unknown>) => Promise<ToolResult>,
): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (server.tool as (...a: any[]) => void)(name, description, schema, cb);
}

export function createServer(config: AzureDevOpsConfig): McpServer {
  const client = new AzureDevOpsClient(config);

  const server = new McpServer({
    name: 'azure-workitems-mcp',
    version: '1.0.0',
  });

  registerTool(
    server,
    'get_work_item',
    'Retrieve a single Azure DevOps work item by ID. Description and Acceptance Criteria are returned as Markdown.',
    { id: z.number().int().positive() },
    async ({ id }) => {
      const numId = id as number;
      try {
        const item = await getWorkItem(client, numId);
        return { content: [{ type: 'text', text: JSON.stringify(item) }] };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { content: [{ type: 'text', text: message }], isError: true };
      }
    },
  );

  registerTool(
    server,
    'list_work_items',
    'List Azure DevOps work items with optional filters (project, type, state, iteration, top).',
    {
      project: z.string().min(1).optional(),
      type: z.string().min(1).optional(),
      state: z.string().min(1).optional(),
      iteration: z.string().min(1).optional(),
      top: z.number().int().min(1).max(200).default(50).optional(),
    },
    async ({ project, type, state, iteration, top }) => {
      try {
        const filter = {
          project: project as string | undefined,
          type: type as string | undefined,
          state: state as string | undefined,
          iteration: iteration as string | undefined,
          top: top as number | undefined,
        };
        const items = await listWorkItems(client, filter, config);
        return { content: [{ type: 'text', text: JSON.stringify(items) }] };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { content: [{ type: 'text', text: message }], isError: true };
      }
    },
  );

  registerTool(
    server,
    'query_work_items',
    'Execute a WIQL query and return matching work item summaries.',
    {
      wiql: z.string().min(1),
      top: z.number().int().min(1).max(200).default(50).optional(),
    },
    async ({ wiql, top }) => {
      const clampedTop = (top as number | undefined) ?? 50;
      try {
        const items = await queryWorkItems(client, wiql as string, clampedTop);
        return { content: [{ type: 'text', text: JSON.stringify(items) }] };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { content: [{ type: 'text', text: message }], isError: true };
      }
    },
  );

  server.resource(
    'work-item',
    new ResourceTemplate('azdo://workitem/{id}', { list: undefined }),
    { description: 'Full Azure DevOps work item with all fields as JSON', mimeType: 'application/json' },
    async (uri, { id }) => {
      const numId = parseInt(String(id), 10);
      if (isNaN(numId) || numId <= 0) {
        throw new Error(`Invalid work item ID in URI: ${uri.href}`);
      }
      const item = await getWorkItem(client, numId);
      return {
        contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify(item) }],
      };
    },
  );

  return server;
}
