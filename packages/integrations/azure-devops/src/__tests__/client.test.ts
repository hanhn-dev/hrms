import { afterEach, describe, expect, it, vi } from 'vitest';
import { Readable } from 'node:stream';
import { AzureDevOpsClient } from '../client.js';

const client = new AzureDevOpsClient({
  orgUrl: 'https://dev.azure.com/example',
  project: 'Project',
  token: 'pat-token',
});

describe('AzureDevOpsClient.getAttachmentMetadata', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses HEAD metadata when Azure returns content headers', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 200,
        headers: {
          'content-type': 'image/png',
          'content-length': '2048',
        },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await client.getAttachmentMetadata('https://dev.azure.com/example/_apis/wit/attachments/1');

    expect(result).toEqual({ contentType: 'image/png', size: 2048 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://dev.azure.com/example/_apis/wit/attachments/1',
      expect.objectContaining({ method: 'HEAD' }),
    );
  });

  it('falls back to GET when HEAD does not return usable metadata', async () => {
    const cancel = vi.fn().mockResolvedValue(undefined);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(null, {
          status: 200,
          headers: {},
        }),
      )
      .mockResolvedValueOnce({
        ok: true,
        headers: new Headers({
          'content-type': 'image/webp',
          'content-length': '5120',
        }),
        body: { cancel },
      });
    vi.stubGlobal('fetch', fetchMock);

    const result = await client.getAttachmentMetadata('https://dev.azure.com/example/_apis/wit/attachments/2');

    expect(result).toEqual({ contentType: 'image/webp', size: 5120 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: 'HEAD' });
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({ method: 'GET' });
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it('returns null metadata when attachment requests fail', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('network error'));
    vi.stubGlobal('fetch', fetchMock);

    const result = await client.getAttachmentMetadata('https://dev.azure.com/example/_apis/wit/attachments/3');

    expect(result).toEqual({ contentType: null, size: null });
  });
});

describe('AzureDevOpsClient.getAttachmentContent', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('downloads attachment content via the Work Item Tracking API', async () => {
    const getAttachmentContent = vi
      .fn()
      .mockResolvedValue(Readable.from([Buffer.from('image-'), Buffer.from('bytes')]));
    vi.spyOn(client, 'getWorkItemTrackingApi').mockResolvedValue({
      getAttachmentContent,
    } as never);

    const result = await client.getAttachmentContent(
      'https://dev.azure.com/example/_apis/wit/attachments/attachment-123?fileName=diagram.png',
    );

    expect(getAttachmentContent).toHaveBeenCalledWith('attachment-123', 'diagram.png', 'Project');
    expect(result).toEqual(Buffer.from('image-bytes'));
  });

  it('rejects invalid attachment URLs before calling the API', async () => {
    await expect(client.getAttachmentContent('not-a-valid-url')).rejects.toThrow(
      'Invalid Azure DevOps attachment URL',
    );
  });
});