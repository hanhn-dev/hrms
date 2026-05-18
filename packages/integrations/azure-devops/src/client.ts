import * as azdev from 'azure-devops-node-api';
import type { IWorkItemTrackingApi } from 'azure-devops-node-api/WorkItemTrackingApi.js';
import type { AzureDevOpsConfig, WorkItemAttachment } from './types.js';

type AttachmentMetadata = Pick<WorkItemAttachment, 'contentType' | 'size'>;

export class AzureDevOpsClient {
  readonly config: AzureDevOpsConfig;
  private _witApi: IWorkItemTrackingApi | null = null;
  private _connection: azdev.WebApi;

  constructor(config: AzureDevOpsConfig) {
    this.config = config;
    const authHandler = azdev.getPersonalAccessTokenHandler(config.token);
    this._connection = new azdev.WebApi(config.orgUrl, authHandler);
  }

  async getWorkItemTrackingApi(): Promise<IWorkItemTrackingApi> {
    if (this._witApi === null) {
      this._witApi = await this._connection.getWorkItemTrackingApi();
    }
    return this._witApi;
  }

  async getAttachmentMetadata(url: string): Promise<AttachmentMetadata> {
    const headMetadata = await this.fetchAttachmentMetadata(url, 'HEAD');
    if (headMetadata.contentType !== null || headMetadata.size !== null) {
      return headMetadata;
    }

    return this.fetchAttachmentMetadata(url, 'GET');
  }

  async getAttachmentContent(url: string): Promise<Buffer> {
    const attachmentReference = parseAttachmentReference(url);
    if (attachmentReference === null) {
      throw new Error(`Invalid Azure DevOps attachment URL: ${url}`);
    }

    const witApi = await this.getWorkItemTrackingApi();
    const contentStream = await witApi.getAttachmentContent(
      attachmentReference.id,
      attachmentReference.fileName ?? undefined,
      this.config.project,
    );

    return streamToBuffer(contentStream);
  }

  private async fetchAttachmentMetadata(
    url: string,
    method: 'GET' | 'HEAD',
  ): Promise<AttachmentMetadata> {
    try {
      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Basic ${Buffer.from(`:${this.config.token}`).toString('base64')}`,
        },
      });

      if (!response.ok) {
        return { contentType: null, size: null };
      }

      if (method === 'GET') {
        await response.body?.cancel();
      }

      return {
        contentType: normalizeContentType(response.headers.get('content-type')),
        size: normalizeSize(response.headers.get('content-length')),
      };
    } catch {
      return { contentType: null, size: null };
    }
  }
}

function normalizeContentType(value: string | null): string | null {
  if (value === null) {
    return null;
  }

  const normalizedValue = value.trim();
  return normalizedValue.length > 0 ? normalizedValue : null;
}

function normalizeSize(value: string | null): number | null {
  if (value === null) {
    return null;
  }

  const parsedValue = Number.parseInt(value, 10);
  return Number.isFinite(parsedValue) && parsedValue >= 0 ? parsedValue : null;
}

function parseAttachmentReference(url: string): { id: string; fileName: string | null } | null {
  try {
    const parsedUrl = new URL(url);
    const pathnameSegments = parsedUrl.pathname.split('/').filter(Boolean);
    const id = pathnameSegments[pathnameSegments.length - 1];
    if (!id) {
      return null;
    }

    return {
      id: decodeURIComponent(id),
      fileName: parsedUrl.searchParams.get('fileName'),
    };
  } catch {
    return null;
  }
}

async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];

  for await (const chunk of stream) {
    if (Buffer.isBuffer(chunk)) {
      chunks.push(chunk);
      continue;
    }

    if (ArrayBuffer.isView(chunk)) {
      chunks.push(Buffer.from(chunk.buffer, chunk.byteOffset, chunk.byteLength));
      continue;
    }

    chunks.push(Buffer.from(String(chunk)));
  }

  return Buffer.concat(chunks);
}
