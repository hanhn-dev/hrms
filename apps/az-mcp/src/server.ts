import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  AzureDevOpsClient,
  getWorkItem,
  getWorkItemHierarchyContext,
  listWorkItems,
  queryWorkItems,
} from '@hrms/azure-devops';
import type { AzureDevOpsConfig } from '@hrms/azure-devops';
import { z } from 'zod';
import { createWorkItemImageResourceHandler } from './resources/work-item-image-resource.js';
import { createGetPullRequestHandler } from './tools/get-pull-request.js';
import { createGetWorkItemCommentsHandler } from './tools/get-work-item-comments.js';
import { createGetWorkItemImageHandler } from './tools/get-work-item-image.js';
import { createGetWorkItemPullRequestsHandler } from './tools/get-work-item-pull-requests.js';
import { createGetWorkItemsHandler } from './tools/get-work-items.js';
import { createListPullRequestThreadsHandler } from './tools/list-pull-request-threads.js';
import { createSearchWorkItemsHandler } from './tools/search-work-items.js';

type RegisteredToolResult = {
  content: Array<{ type: 'text'; text: string } | { type: 'image'; data: string; mimeType: string }>;
  isError?: boolean;
};

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
  cb: (args: Record<string, unknown>) => Promise<RegisteredToolResult>,
): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (server.tool as (...a: any[]) => void)(name, description, schema, cb);
}

export function createServer(config: AzureDevOpsConfig): McpServer {
  const client = new AzureDevOpsClient(config);
  const readWorkItemImageResource = createWorkItemImageResourceHandler(client);

  const server = new McpServer({
    name: 'azure-workitems-mcp',
    version: '1.0.0',
  });

  const getWorkItemPullRequestsHandler = createGetWorkItemPullRequestsHandler(client, {
    elicitInput: (params) =>
      server.server.elicitInput(params as Parameters<typeof server.server.elicitInput>[0]),
  });
  const getWorkItemsHandler = createGetWorkItemsHandler(client);
  const getPullRequestHandler = createGetPullRequestHandler(client);
  const getWorkItemCommentsHandler = createGetWorkItemCommentsHandler(client);
  const getWorkItemImageHandler = createGetWorkItemImageHandler(client);
  const listPullRequestThreadsHandler = createListPullRequestThreadsHandler(client);
  const searchWorkItemsHandler = createSearchWorkItemsHandler(client, config);

  registerTool(
    server,
    'az_get_work_item',
    'Retrieve one work item as an investigation packet (Markdown description, Repro Steps, acceptance criteria, priority, links, attachment resource URIs, hints). Use when you have a single ID. Use az_get_work_item_hierarchy_context when the item may have child Tasks. Use az_get_work_items for a comma-separated list.',
    { id: z.number().int().positive().describe('Positive Azure DevOps work item ID') },
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
    'az_get_work_item_hierarchy_context',
    'Retrieve a work item and all its descendants, with Description, Repro Steps, Acceptance Criteria, and image resource URIs. Use when the item is a User Story/Feature/PBI that may have child Tasks. Do not use for a single Bug with no children — use az_get_work_item.',
    { id: z.number().int().positive().describe('Root work item ID to expand downward') },
    async ({ id }) => {
      const numId = id as number;
      try {
        const response = await getWorkItemHierarchyContext(client, numId);
        return { content: [{ type: 'text', text: JSON.stringify(response) }] };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { content: [{ type: 'text', text: message }], isError: true };
      }
    },
  );

  registerTool(
    server,
    'az_get_work_items',
    'Retrieve multiple work items from a comma-separated list of IDs, preserving input order and reporting per-item issues. Use instead of calling az_get_work_item in a loop.',
    { ids: z.string().min(1).describe('Comma-separated work item IDs, e.g. "101,202,303"') },
    async ({ ids }) => getWorkItemsHandler({ ids: ids as string }),
  );

  registerTool(
    server,
    'az_get_work_item_comments',
    'Retrieve discussion comments for a work item, newest first. Use after az_get_work_item when the description is thin or QA notes may exist.',
    {
      id: z.number().int().positive().describe('Work item ID'),
      top: z.number().int().min(1).max(200).optional().describe('Max comments to return (default 50)'),
    },
    async ({ id, top }) => getWorkItemCommentsHandler({ id: id as number, top: top as number | undefined }),
  );

  registerTool(
    server,
    'az_get_work_item_image',
    'Retrieve one image attachment so the model can see a screenshot. Use when attachments[].isImage is true. Do not fetch non-image attachments.',
    {
      id: z.number().int().positive().describe('Work item ID that owns the attachment'),
      attachmentId: z.string().min(1).describe('Attachment ID from attachments[].id'),
    },
    async ({ id, attachmentId }) =>
      getWorkItemImageHandler({ id: id as number, attachmentId: attachmentId as string }),
  );

  registerTool(
    server,
    'az_get_pull_request',
    'Retrieve a pull request by numeric ID or HTTPS URL, with paginated truncated unified diffs. Use for code review. Use az_list_pull_request_threads for review comments. Pass includeContents true only when you need both file sides.',
    {
      pullRequest: z
        .union([z.number().int().positive(), z.string().min(1)])
        .describe('Pull request ID or Azure DevOps HTTPS URL'),
      top: z.number().int().min(1).max(100).optional().describe('Changed files to return (default 50, max 100)'),
      skip: z.number().int().min(0).optional().describe('Changed files to skip for pagination'),
      includeContents: z
        .boolean()
        .optional()
        .describe('When true, also return baseContent and currentContent for each file'),
    },
    async ({ pullRequest, top, skip, includeContents }) =>
      getPullRequestHandler({
        pullRequest: pullRequest as string | number,
        top: top as number | undefined,
        skip: skip as number | undefined,
        includeContents: includeContents as boolean | undefined,
      }),
  );

  registerTool(
    server,
    'az_list_pull_request_threads',
    'Retrieve pull request comment threads with file/line anchors. Default status is active. Read-only — this tool does not reply or resolve.',
    {
      pullRequest: z
        .union([z.number().int().positive(), z.string().min(1)])
        .describe('Pull request ID or Azure DevOps HTTPS URL'),
      status: z
        .string()
        .min(1)
        .optional()
        .describe('Thread status filter: active (default), fixed, wontfix, closed, bydesign, pending'),
    },
    async ({ pullRequest, status }) =>
      listPullRequestThreadsHandler({
        pullRequest: pullRequest as string | number,
        status: status as string | undefined,
      }),
  );

  registerTool(
    server,
    'az_get_work_item_pull_requests',
    'Retrieve pull requests linked to work items and their immediate child Tasks or Issues, then return refinement prompts or the final hash-focused summary. Use when you need merge commits to cherry-pick. Use az_get_pull_request for review diffs.',
    {
      ids: z.string().min(1).describe('Comma-separated work item IDs'),
      authors: z.array(z.string().min(1)).optional().describe('Keep PRs by these author display names'),
      targetBranches: z.array(z.string().min(1)).optional().describe('Keep PRs targeting these branches'),
      statuses: z.array(z.string().min(1)).optional().describe('Keep PRs with these statuses'),
      sortBy: z.enum(['mergedDate', 'pullRequestId']).optional().describe('Sort field for the final list'),
      sortDirection: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
      confirmUnfiltered: z.boolean().optional().describe('Return all linked PRs without a refinement prompt'),
    },
    async ({ ids, authors, targetBranches, statuses, sortBy, sortDirection, confirmUnfiltered }) =>
      getWorkItemPullRequestsHandler({
        ids: ids as string,
        authors: authors as string[] | undefined,
        targetBranches: targetBranches as string[] | undefined,
        statuses: statuses as string[] | undefined,
        sortBy: sortBy as 'mergedDate' | 'pullRequestId' | undefined,
        sortDirection: sortDirection as 'asc' | 'desc' | undefined,
        confirmUnfiltered: confirmUnfiltered as boolean | undefined,
      }),
  );

  registerTool(
    server,
    'az_list_work_items',
    'List work item summaries with optional filters (project, type, state, iteration, top). Prefer az_search_work_items for title/assignee/changedSince. Use az_get_work_item after you pick an ID.',
    {
      project: z.string().min(1).optional().describe('Azure DevOps project name; defaults to configured project'),
      type: z.string().min(1).optional().describe('Work item type, e.g. Bug or User Story'),
      state: z.string().min(1).optional().describe('Work item state, e.g. Active'),
      iteration: z.string().min(1).optional().describe('Iteration path prefix (UNDER match)'),
      top: z.number().int().min(1).max(200).default(50).optional().describe('Max results (default 50, max 200)'),
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
    'az_search_work_items',
    'Structured work-item search. Use this instead of writing WIQL. Use az_query_work_items only when you already have a WIQL string.',
    {
      project: z.string().min(1).optional().describe('Azure DevOps project name; defaults to configured project'),
      titleContains: z.string().min(1).optional().describe('Substring match on title'),
      assignedTo: z.string().min(1).optional().describe('Assignee display name, or @Me for the current identity'),
      type: z.string().min(1).optional().describe('Work item type'),
      state: z.string().min(1).optional().describe('Work item state'),
      iteration: z.string().min(1).optional().describe('Iteration path prefix (UNDER match)'),
      changedSince: z.string().min(1).optional().describe('ISO date (YYYY-MM-DD) for System.ChangedDate >= '),
      top: z.number().int().min(1).max(200).optional().describe('Max results (default 50, max 200)'),
    },
    async ({ project, titleContains, assignedTo, type, state, iteration, changedSince, top }) =>
      searchWorkItemsHandler({
        project: project as string | undefined,
        titleContains: titleContains as string | undefined,
        assignedTo: assignedTo as string | undefined,
        type: type as string | undefined,
        state: state as string | undefined,
        iteration: iteration as string | undefined,
        changedSince: changedSince as string | undefined,
        top: top as number | undefined,
      }),
  );

  registerTool(
    server,
    'az_query_work_items',
    'Execute a raw WIQL query and return matching work item summaries. Prefer az_search_work_items unless you already have WIQL.',
    {
      wiql: z.string().min(1).describe('Full WIQL query string'),
      top: z.number().int().min(1).max(200).default(50).optional().describe('Max results (default 50, max 200)'),
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

  server.resource(
    'work-item-image',
    new ResourceTemplate('azdo://workitem/{id}/images/{attachmentId}', { list: undefined }),
    {
      description: 'Image attachment for an Azure DevOps work item as binary content.',
      mimeType: 'application/octet-stream',
    },
    readWorkItemImageResource,
  );

  return server;
}
