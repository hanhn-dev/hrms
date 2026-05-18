import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@hrms/azure-devops', () => ({
  AzureDevOpsClient: vi.fn().mockImplementation(function MockAzureDevOpsClient(config) {
    return {
      config,
      getAttachmentContent: vi.fn().mockResolvedValue(Buffer.from('image-bytes')),
    };
  }),
  getWorkItem: vi.fn(),
  listWorkItems: vi.fn(),
  queryWorkItems: vi.fn(),
}));

import { getWorkItem } from '@hrms/azure-devops';
import type { AzureDevOpsConfig, WorkItem } from '@hrms/azure-devops';
import { createServer } from '../server.js';

const config: AzureDevOpsConfig = {
  orgUrl: 'https://dev.azure.com/example',
  project: 'Sample Project',
  token: 'test-pat',
};

const mockWorkItem: WorkItem = {
  id: 135898,
  title: 'Sample work item',
  type: 'Product Backlog Item',
  state: 'Done',
  description: 'Description',
  acceptanceCriteria: 'Acceptance Criteria',
  attachments: [
    {
      id: 'img-1',
      name: 'flow.png',
      url: 'https://dev.azure.com/example/flow.png',
      comment: 'User flow',
      contentType: 'image/png',
      size: 8192,
      isImage: true,
    },
  ],
  tags: [],
  assignedTo: 'Jane Smith',
  iterationPath: 'Project\\Sprint 1',
  areaPath: 'Project',
  parentId: null,
  url: 'https://dev.azure.com/example/_workitems/edit/135898',
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
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registers get_work_item with an id input schema', async () => {
    const session = await connectClientAndServer();

    try {
      const tools = await session.client.listTools();
      const tool = tools.tools.find(({ name }) => name === 'get_work_item');

      expect(tool?.inputSchema).toMatchObject({
        type: 'object',
        properties: {
          id: {
            type: 'integer',
            exclusiveMinimum: 0,
          },
        },
        required: ['id'],
      });
    } finally {
      await session.close();
    }
  });

  it('passes the id argument through to getWorkItem', async () => {
    vi.mocked(getWorkItem).mockResolvedValue(mockWorkItem);
    const session = await connectClientAndServer();

    try {
      const result = await session.client.callTool({
        name: 'get_work_item',
        arguments: { id: 135898 },
      });
      const content = result.content as Array<{ type: 'text'; text: string }>;

      expect(getWorkItem).toHaveBeenCalledWith(expect.anything(), 135898);
      expect(result.isError).toBeFalsy();
      expect(JSON.parse(content[0]!.text)).toMatchObject({ id: 135898 });
    } finally {
      await session.close();
    }
  });

  it('serves image attachments as blob resources', async () => {
    vi.mocked(getWorkItem).mockResolvedValue(mockWorkItem);
    const session = await connectClientAndServer();

    try {
      const result = await session.client.readResource({
        uri: 'azdo://workitem/135898/images/img-1',
      });

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0]).toMatchObject({
        uri: 'azdo://workitem/135898/images/img-1',
        mimeType: 'image/png',
        blob: Buffer.from('image-bytes').toString('base64'),
      });
    } finally {
      await session.close();
    }
  });
});