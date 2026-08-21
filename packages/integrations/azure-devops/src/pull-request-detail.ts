import {
  GitVersionType,
  LineDiffBlockChangeType,
  PullRequestStatus,
  VersionControlChangeType,
  type FileDiff,
  type GitCommitRef,
  type GitItem,
  type GitPullRequest,
  type GitPullRequestChange,
  type GitPullRequestIteration,
  type IdentityRefWithVote,
  type LineDiffBlock,
} from 'azure-devops-node-api/interfaces/GitInterfaces.js';
import {
  classifyPullRequestLookupError,
  getAzureDevOpsErrorMessage,
  type AzureDevOpsClient,
} from './client.js';
import type {
  PullRequestChangeType,
  PullRequestChangedFile,
  PullRequestCommitSummary,
  PullRequestDetail,
  PullRequestDetailRequest,
  PullRequestHashes,
  PullRequestLineDiffBlock,
  PullRequestLineDiffChangeType,
  PullRequestReviewer,
  PullRequestReviewerVote,
} from './types.js';

const DEFAULT_TOP = 50;
const MAX_TOP = 100;
const MAX_TEXT_BYTES = 100_000;
const CUMULATIVE_COMPARE_TO = 0;

export type ParsedPullRequestReference =
  | {
      readonly kind: 'id';
      readonly pullRequestId: number;
    }
  | {
      readonly kind: 'url';
      readonly pullRequestId: number;
      readonly project: string;
      readonly repository: string;
      readonly organization: string;
    };

function parsePositiveId(value: string): number | null {
  if (!/^[1-9]\d*$/.test(value)) {
    return null;
  }

  const parsedValue = Number.parseInt(value, 10);
  return Number.isSafeInteger(parsedValue) ? parsedValue : null;
}

function normalizeOrganizationIdentity(value: string): string {
  return value.trim().replace(/\/+$/, '').toLowerCase();
}

export function getOrganizationIdentity(orgUrl: string): string {
  try {
    const parsedUrl = new URL(orgUrl);
    const host = parsedUrl.hostname.toLowerCase();

    if (host === 'dev.azure.com' || host.endsWith('.dev.azure.com')) {
      const [organization] = parsedUrl.pathname.split('/').filter(Boolean);
      if (!organization) {
        throw new Error(`Unable to determine organization from org URL: ${orgUrl}`);
      }
      return normalizeOrganizationIdentity(decodeURIComponent(organization));
    }

    const visualStudioMatch = host.match(/^([^.]+)\.visualstudio\.com$/i);
    if (visualStudioMatch?.[1]) {
      return normalizeOrganizationIdentity(visualStudioMatch[1]);
    }

    throw new Error(`Unsupported Azure DevOps organization URL: ${orgUrl}`);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Unsupported')) {
      throw error;
    }
    if (error instanceof Error && error.message.startsWith('Unable to determine')) {
      throw error;
    }
    throw new Error(`Invalid Azure DevOps organization URL: ${orgUrl}`);
  }
}

export function parsePullRequestReference(pullRequest: string | number): ParsedPullRequestReference {
  if (typeof pullRequest === 'number') {
    if (!Number.isInteger(pullRequest) || pullRequest <= 0) {
      throw new Error(`Invalid pull request identifier: ${pullRequest}`);
    }
    return { kind: 'id', pullRequestId: pullRequest };
  }

  const trimmed = pullRequest.trim();
  if (trimmed.length === 0) {
    throw new Error('Invalid pull request identifier: empty value');
  }

  const asId = parsePositiveId(trimmed);
  if (asId !== null) {
    return { kind: 'id', pullRequestId: asId };
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(trimmed);
  } catch {
    throw new Error(`Invalid pull request identifier: ${pullRequest}`);
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    throw new Error(`Invalid pull request identifier: ${pullRequest}`);
  }

  const host = parsedUrl.hostname.toLowerCase();
  const segments = parsedUrl.pathname.split('/').filter(Boolean).map((segment) => decodeURIComponent(segment));

  let organization: string;
  let remainingSegments: string[];

  if (host === 'dev.azure.com' || host.endsWith('.dev.azure.com')) {
    if (segments.length < 5) {
      throw new Error(`Invalid pull request URL: ${pullRequest}`);
    }
    organization = segments[0]!;
    remainingSegments = segments.slice(1);
  } else {
    const visualStudioMatch = host.match(/^([^.]+)\.visualstudio\.com$/i);
    if (!visualStudioMatch?.[1]) {
      throw new Error(`Invalid pull request URL: ${pullRequest}`);
    }
    organization = visualStudioMatch[1];
    remainingSegments = segments;
  }

  const gitIndex = remainingSegments.findIndex((segment) => segment.toLowerCase() === '_git');
  const pullRequestIndex = remainingSegments.findIndex((segment) => segment.toLowerCase() === 'pullrequest');

  if (gitIndex < 1 || pullRequestIndex !== gitIndex + 2 || pullRequestIndex >= remainingSegments.length - 1) {
    throw new Error(`Invalid pull request URL: ${pullRequest}`);
  }

  const project = remainingSegments[gitIndex - 1]!;
  const repository = remainingSegments[gitIndex + 1]!;
  const pullRequestId = parsePositiveId(remainingSegments[pullRequestIndex + 1]!);

  if (!project || !repository || pullRequestId === null) {
    throw new Error(`Invalid pull request URL: ${pullRequest}`);
  }

  return {
    kind: 'url',
    pullRequestId,
    project,
    repository,
    organization: normalizeOrganizationIdentity(organization),
  };
}

function normalizePagination(request: PullRequestDetailRequest): { top: number; skip: number } {
  const top = request.top ?? DEFAULT_TOP;
  const skip = request.skip ?? 0;

  if (!Number.isInteger(top) || top < 1 || top > MAX_TOP) {
    throw new Error(`Invalid top value: ${String(request.top)}. Expected an integer between 1 and ${MAX_TOP}.`);
  }

  if (!Number.isInteger(skip) || skip < 0) {
    throw new Error(`Invalid skip value: ${String(request.skip)}. Expected an integer greater than or equal to 0.`);
  }

  return { top, skip };
}

function normalizePullRequestStatus(status: PullRequestStatus | undefined): string {
  switch (status) {
    case PullRequestStatus.Active:
      return 'active';
    case PullRequestStatus.Abandoned:
      return 'abandoned';
    case PullRequestStatus.Completed:
      return 'completed';
    default:
      return 'not_set';
  }
}

function getDisplayName(value: { displayName?: string; uniqueName?: string } | undefined): string | null {
  if (typeof value?.displayName === 'string' && value.displayName.trim().length > 0) {
    return value.displayName.trim();
  }

  if (typeof value?.uniqueName === 'string' && value.uniqueName.trim().length > 0) {
    return value.uniqueName.trim();
  }

  return null;
}

function toIsoString(value: Date | string | undefined): string | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    return value;
  }

  return null;
}

function getCommitId(value: { commitId?: string } | undefined): string | null {
  if (typeof value?.commitId === 'string' && value.commitId.trim().length > 0) {
    return value.commitId.trim();
  }

  return null;
}

function buildHashes(pullRequest: GitPullRequest): PullRequestHashes {
  return {
    mergeCommit: getCommitId(pullRequest.lastMergeCommit),
    sourceCommit: getCommitId(pullRequest.lastMergeSourceCommit),
    targetCommit: getCommitId(pullRequest.lastMergeTargetCommit),
  };
}

function buildPullRequestUrl(
  pullRequest: GitPullRequest,
  projectId: string,
  repositoryId: string,
  pullRequestId: number,
  orgUrl: string,
): string {
  if (typeof pullRequest.url === 'string' && pullRequest.url.trim().length > 0) {
    return pullRequest.url;
  }

  const repositoryName =
    typeof pullRequest.repository?.name === 'string' && pullRequest.repository.name.trim().length > 0
      ? pullRequest.repository.name
      : repositoryId;

  return `${orgUrl.replace(/\/+$/, '')}/${encodeURIComponent(projectId)}/_git/${encodeURIComponent(repositoryName)}/pullrequest/${pullRequestId}`;
}

function normalizeReviewerVote(vote: number | undefined): PullRequestReviewerVote {
  switch (vote) {
    case 10:
      return 'approved';
    case 5:
      return 'approved_with_suggestions';
    case 0:
      return 'no_vote';
    case -5:
      return 'waiting_for_author';
    case -10:
      return 'rejected';
    default:
      return 'unknown';
  }
}

function mapReviewers(reviewers: readonly IdentityRefWithVote[] | undefined): PullRequestReviewer[] {
  return (reviewers ?? []).map((reviewer) => ({
    displayName: getDisplayName(reviewer),
    vote: normalizeReviewerVote(reviewer.vote),
    isRequired: reviewer.isRequired === true,
  }));
}

function mapCommits(commits: readonly GitCommitRef[] | undefined): PullRequestCommitSummary[] {
  return (commits ?? [])
    .map((commit) => {
      const commitId = getCommitId(commit);
      if (commitId === null) {
        return null;
      }

      const authorName =
        typeof commit.author?.name === 'string' && commit.author.name.trim().length > 0
          ? commit.author.name.trim()
          : typeof commit.committer?.name === 'string' && commit.committer.name.trim().length > 0
            ? commit.committer.name.trim()
            : null;

      return {
        commitId,
        comment: typeof commit.comment === 'string' && commit.comment.trim().length > 0 ? commit.comment.trim() : null,
        author: authorName,
      };
    })
    .filter((commit): commit is PullRequestCommitSummary => commit !== null);
}

function mapWorkItemIds(pullRequest: GitPullRequest): number[] {
  return (pullRequest.workItemRefs ?? [])
    .map((reference) => {
      if (typeof reference.id !== 'string') {
        return null;
      }
      return parsePositiveId(reference.id);
    })
    .filter((id): id is number => id !== null)
    .sort((left, right) => left - right);
}

function hasChangeFlag(changeType: VersionControlChangeType | undefined, flag: VersionControlChangeType): boolean {
  if (changeType === undefined) {
    return false;
  }
  return (changeType & flag) === flag;
}

function normalizeChangeType(changeType: VersionControlChangeType | undefined): PullRequestChangeType {
  if (hasChangeFlag(changeType, VersionControlChangeType.Rename) || hasChangeFlag(changeType, VersionControlChangeType.SourceRename)) {
    return 'rename';
  }
  if (hasChangeFlag(changeType, VersionControlChangeType.Add)) {
    return 'add';
  }
  if (hasChangeFlag(changeType, VersionControlChangeType.Delete)) {
    return 'delete';
  }
  if (hasChangeFlag(changeType, VersionControlChangeType.Edit)) {
    return 'edit';
  }
  return 'other';
}

function normalizeLineDiffChangeType(changeType: LineDiffBlockChangeType | undefined): PullRequestLineDiffChangeType {
  switch (changeType) {
    case LineDiffBlockChangeType.None:
      return 'none';
    case LineDiffBlockChangeType.Add:
      return 'add';
    case LineDiffBlockChangeType.Delete:
      return 'delete';
    case LineDiffBlockChangeType.Edit:
      return 'edit';
    default:
      return 'none';
  }
}

function mapLineDiffBlocks(blocks: readonly LineDiffBlock[] | undefined): PullRequestLineDiffBlock[] {
  return (blocks ?? []).map((block) => ({
    changeType: normalizeLineDiffChangeType(block.changeType),
    originalLineNumberStart: typeof block.originalLineNumberStart === 'number' ? block.originalLineNumberStart : null,
    originalLinesCount: typeof block.originalLinesCount === 'number' ? block.originalLinesCount : null,
    modifiedLineNumberStart: typeof block.modifiedLineNumberStart === 'number' ? block.modifiedLineNumberStart : null,
    modifiedLinesCount: typeof block.modifiedLinesCount === 'number' ? block.modifiedLinesCount : null,
  }));
}

function getChangePath(change: GitPullRequestChange): string | null {
  if (typeof change.item?.path === 'string' && change.item.path.trim().length > 0) {
    return change.item.path;
  }
  if (typeof change.sourceServerItem === 'string' && change.sourceServerItem.trim().length > 0) {
    return change.sourceServerItem;
  }
  return null;
}

function getOriginalPath(change: GitPullRequestChange, changeType: PullRequestChangeType): string | null {
  if (typeof change.originalPath === 'string' && change.originalPath.trim().length > 0) {
    return change.originalPath;
  }
  if (changeType === 'rename' && typeof change.sourceServerItem === 'string' && change.sourceServerItem.trim().length > 0) {
    return change.sourceServerItem;
  }
  return null;
}

function isBinaryItem(item: GitItem | undefined): boolean {
  return item?.contentMetadata?.isBinary === true || item?.isFolder === true;
}

function splitLines(value: string): string[] {
  return value.length === 0 ? [] : value.split(/\r?\n/);
}

function formatDiffPath(path: string): string {
  return path.startsWith('/') ? path : `/${path}`;
}

function sliceFileLines(lines: readonly string[], start: number | null, count: number | null): string[] {
  if (start === null || count === null || count <= 0 || start < 1) {
    return [];
  }

  return lines.slice(start - 1, start - 1 + count);
}

function formatHunkHeader(
  originalStart: number,
  originalCount: number,
  modifiedStart: number,
  modifiedCount: number,
): string {
  return `@@ -${originalStart},${originalCount} +${modifiedStart},${modifiedCount} @@`;
}

function buildUnifiedDiff(file: {
  readonly path: string;
  readonly originalPath: string | null;
  readonly changeType: PullRequestChangeType;
  readonly baseContent: string | null;
  readonly currentContent: string | null;
  readonly lineDiffBlocks: readonly PullRequestLineDiffBlock[];
}): { diff: string | null; truncated: boolean } {
  if (file.baseContent === null && file.currentContent === null) {
    return { diff: null, truncated: false };
  }

  const oldPath = formatDiffPath(file.originalPath ?? file.path);
  const newPath = formatDiffPath(file.path);
  const header = `--- a${oldPath}\n+++ b${newPath}`;
  const baseLines = splitLines(file.baseContent ?? '');
  const currentLines = splitLines(file.currentContent ?? '');
  const hunks: string[] = [];

  if (file.changeType === 'add') {
    hunks.push(
      [
        formatHunkHeader(0, 0, currentLines.length === 0 ? 0 : 1, currentLines.length),
        ...currentLines.map((line) => `+${line}`),
      ].join('\n'),
    );
  } else if (file.changeType === 'delete') {
    hunks.push(
      [
        formatHunkHeader(baseLines.length === 0 ? 0 : 1, baseLines.length, 0, 0),
        ...baseLines.map((line) => `-${line}`),
      ].join('\n'),
    );
  } else {
    const changedBlocks = file.lineDiffBlocks.filter((block) => block.changeType !== 'none');
    for (const block of changedBlocks) {
      const originalLines = sliceFileLines(baseLines, block.originalLineNumberStart, block.originalLinesCount);
      const modifiedLines = sliceFileLines(currentLines, block.modifiedLineNumberStart, block.modifiedLinesCount);
      const originalStart = block.originalLineNumberStart ?? 0;
      const modifiedStart = block.modifiedLineNumberStart ?? 0;
      const body: string[] = [];

      if (block.changeType === 'add') {
        body.push(...modifiedLines.map((line) => `+${line}`));
      } else if (block.changeType === 'delete') {
        body.push(...originalLines.map((line) => `-${line}`));
      } else {
        body.push(...originalLines.map((line) => `-${line}`), ...modifiedLines.map((line) => `+${line}`));
      }

      hunks.push(
        [formatHunkHeader(originalStart, originalLines.length, modifiedStart, modifiedLines.length), ...body].join('\n'),
      );
    }

    if (hunks.length === 0 && file.baseContent !== file.currentContent) {
      hunks.push(
        [
          formatHunkHeader(baseLines.length === 0 ? 0 : 1, baseLines.length, currentLines.length === 0 ? 0 : 1, currentLines.length),
          ...baseLines.map((line) => `-${line}`),
          ...currentLines.map((line) => `+${line}`),
        ].join('\n'),
      );
    }
  }

  if (hunks.length === 0) {
    return { diff: null, truncated: false };
  }

  const truncated = truncateText([header, ...hunks].join('\n'));
  return { diff: truncated.content, truncated: truncated.truncated };
}

function truncateText(value: string): { content: string; truncated: boolean } {
  const bytes = Buffer.byteLength(value, 'utf8');
  if (bytes <= MAX_TEXT_BYTES) {
    return { content: value, truncated: false };
  }

  let end = Math.min(value.length, MAX_TEXT_BYTES);
  while (end > 0 && Buffer.byteLength(value.slice(0, end), 'utf8') > MAX_TEXT_BYTES) {
    end -= 1;
  }

  return {
    content: `${value.slice(0, end)}\n\n/* truncated: content exceeded ${MAX_TEXT_BYTES} bytes */`,
    truncated: true,
  };
}

async function streamToString(stream: NodeJS.ReadableStream): Promise<string> {
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

  const buffer = Buffer.concat(chunks);
  if (buffer.includes(0)) {
    throw new Error('Binary content detected');
  }

  return buffer.toString('utf8');
}

async function readFileContent(
  client: AzureDevOpsClient,
  repositoryId: string,
  projectId: string,
  path: string | null,
  commitId: string | null,
): Promise<{ content: string | null; isBinary: boolean; truncated: boolean; omission: string | null }> {
  if (path === null || commitId === null) {
    return { content: null, isBinary: false, truncated: false, omission: null };
  }

  const gitApi = await client.getGitApi();

  try {
    const item = await gitApi.getItem(
      repositoryId,
      path,
      projectId,
      undefined,
      undefined,
      true,
      false,
      false,
      { version: commitId, versionType: GitVersionType.Commit },
      false,
    );

    if (isBinaryItem(item)) {
      return {
        content: null,
        isBinary: true,
        truncated: false,
        omission: 'Binary or non-text content omitted',
      };
    }

    const contentStream = await gitApi.getItemContent(
      repositoryId,
      path,
      projectId,
      undefined,
      undefined,
      true,
      false,
      false,
      { version: commitId, versionType: GitVersionType.Commit },
      true,
    );

    const rawContent = await streamToString(contentStream);
    const truncated = truncateText(rawContent);
    return {
      content: truncated.content,
      isBinary: false,
      truncated: truncated.truncated,
      omission: null,
    };
  } catch (error) {
    const message = getAzureDevOpsErrorMessage(error);
    if (/binary content detected/i.test(message)) {
      return {
        content: null,
        isBinary: true,
        truncated: false,
        omission: 'Binary or non-text content omitted',
      };
    }

    return {
      content: null,
      isBinary: false,
      truncated: false,
      omission: `Unable to read file content: ${message}`,
    };
  }
}

async function loadLineDiffBlocks(
  client: AzureDevOpsClient,
  repositoryId: string,
  projectId: string,
  path: string,
  originalPath: string | null,
  sourceCommit: string | null,
  targetCommit: string | null,
): Promise<PullRequestLineDiffBlock[]> {
  if (sourceCommit === null || targetCommit === null) {
    return [];
  }

  const gitApi = await client.getGitApi();

  try {
    const diffs: FileDiff[] = await gitApi.getFileDiffs(
      {
        baseVersionCommit: targetCommit,
        targetVersionCommit: sourceCommit,
        fileDiffParams: [
          {
            path,
            originalPath: originalPath ?? path,
          },
        ],
      },
      projectId,
      repositoryId,
    );

    return mapLineDiffBlocks(diffs[0]?.lineDiffBlocks);
  } catch {
    return [];
  }
}

async function hydrateChangedFile(
  client: AzureDevOpsClient,
  change: GitPullRequestChange,
  repositoryId: string,
  projectId: string,
  hashes: PullRequestHashes,
  includeContents: boolean,
): Promise<PullRequestChangedFile | null> {
  const path = getChangePath(change);
  if (path === null) {
    return null;
  }

  const changeType = normalizeChangeType(change.changeType);
  const originalPath = getOriginalPath(change, changeType);
  const binaryFromMetadata = isBinaryItem(change.item);

  if (binaryFromMetadata) {
    return {
      path,
      originalPath,
      changeType,
      isBinary: true,
      omission: 'Binary or non-text content omitted',
      truncation: null,
      unifiedDiff: null,
      baseContent: null,
      currentContent: null,
      lineDiffBlocks: [],
    };
  }

  const basePath = changeType === 'add' ? null : (originalPath ?? path);
  const currentPath = changeType === 'delete' ? null : path;

  const [baseResult, currentResult, lineDiffBlocks] = await Promise.all([
    readFileContent(client, repositoryId, projectId, basePath, hashes.targetCommit),
    readFileContent(client, repositoryId, projectId, currentPath, hashes.sourceCommit),
    loadLineDiffBlocks(
      client,
      repositoryId,
      projectId,
      path,
      originalPath,
      hashes.sourceCommit,
      hashes.targetCommit,
    ),
  ]);

  const isBinary = baseResult.isBinary || currentResult.isBinary;
  const omissions = [baseResult.omission, currentResult.omission].filter((value): value is string => value !== null);
  const baseContent = isBinary ? null : baseResult.content;
  const currentContent = isBinary ? null : currentResult.content;
  const unifiedDiff = isBinary
    ? { diff: null, truncated: false }
    : buildUnifiedDiff({
        path,
        originalPath,
        changeType,
        baseContent,
        currentContent,
        lineDiffBlocks,
      });
  const truncated = {
    base: baseResult.truncated,
    current: currentResult.truncated,
    diff: unifiedDiff.truncated,
  };
  const hasTruncation = truncated.base || truncated.current || truncated.diff;

  return {
    path,
    originalPath,
    changeType,
    isBinary,
    omission: isBinary
      ? 'Binary or non-text content omitted'
      : omissions.length > 0
        ? omissions.join('; ')
        : null,
    truncation: hasTruncation ? truncated : null,
    unifiedDiff: unifiedDiff.diff,
    baseContent: includeContents ? baseContent : null,
    currentContent: includeContents ? currentContent : null,
    lineDiffBlocks,
  };
}

function selectLatestIteration(iterations: readonly GitPullRequestIteration[]): GitPullRequestIteration {
  if (iterations.length === 0) {
    throw new Error('Pull request has no iterations');
  }

  return [...iterations].sort((left, right) => (right.id ?? 0) - (left.id ?? 0))[0]!;
}

export async function resolvePullRequest(
  client: AzureDevOpsClient,
  reference: ParsedPullRequestReference,
): Promise<{ pullRequest: GitPullRequest; projectId: string; repositoryId: string }> {
  const gitApi = await client.getGitApi();
  const configuredOrganization = getOrganizationIdentity(client.config.orgUrl);

  try {
    if (reference.kind === 'url') {
      if (reference.organization !== configuredOrganization) {
        throw new Error('Pull request URL is outside the configured Azure DevOps organization');
      }

      const pullRequest = await gitApi.getPullRequest(
        reference.repository,
        reference.pullRequestId,
        reference.project,
        undefined,
        undefined,
        undefined,
        true,
        true,
      );

      const repositoryId = pullRequest.repository?.id ?? reference.repository;
      return {
        pullRequest,
        projectId: reference.project,
        repositoryId,
      };
    }

    const pullRequest = await gitApi.getPullRequestById(reference.pullRequestId, client.config.project);
    const repositoryId = pullRequest.repository?.id;
    if (typeof repositoryId !== 'string' || repositoryId.trim().length === 0) {
      throw new Error(`Pull request ${reference.pullRequestId} is missing repository information`);
    }

    const projectId =
      typeof pullRequest.repository?.project?.name === 'string' && pullRequest.repository.project.name.trim().length > 0
        ? pullRequest.repository.project.name
        : typeof pullRequest.repository?.project?.id === 'string' && pullRequest.repository.project.id.trim().length > 0
          ? pullRequest.repository.project.id
          : client.config.project;

    let hydrated = pullRequest;
    try {
      hydrated = await gitApi.getPullRequest(
        repositoryId,
        reference.pullRequestId,
        projectId,
        undefined,
        undefined,
        undefined,
        true,
        true,
      );
    } catch {
      hydrated = pullRequest;
    }

    return {
      pullRequest: hydrated,
      projectId,
      repositoryId,
    };
  } catch (error) {
    if (error instanceof Error && error.message === 'Pull request URL is outside the configured Azure DevOps organization') {
      throw error;
    }

    const status = classifyPullRequestLookupError(error);
    if (status === 'inaccessible') {
      throw new Error(`Pull request ${reference.pullRequestId} is inaccessible`);
    }
    throw new Error(`Pull request ${reference.pullRequestId} not found`);
  }
}

export async function getPullRequestDetail(
  client: AzureDevOpsClient,
  request: PullRequestDetailRequest,
): Promise<PullRequestDetail> {
  const reference = parsePullRequestReference(request.pullRequest);
  const { top, skip } = normalizePagination(request);
  const { pullRequest, projectId, repositoryId } = await resolvePullRequest(client, reference);

  const pullRequestId = pullRequest.pullRequestId ?? reference.pullRequestId;
  const hashes = buildHashes(pullRequest);
  const gitApi = await client.getGitApi();

  let iterations: GitPullRequestIteration[];
  try {
    iterations = await gitApi.getPullRequestIterations(repositoryId, pullRequestId, projectId, true);
  } catch (error) {
    throw new Error(`Azure DevOps pull request API error: ${getAzureDevOpsErrorMessage(error)}`);
  }

  const latestIteration = selectLatestIteration(iterations);
  const iterationId = latestIteration.id;
  if (typeof iterationId !== 'number') {
    throw new Error('Pull request latest iteration is missing an id');
  }

  let changePage;
  try {
    changePage = await gitApi.getPullRequestIterationChanges(
      repositoryId,
      pullRequestId,
      iterationId,
      projectId,
      top,
      skip,
      CUMULATIVE_COMPARE_TO,
    );
  } catch (error) {
    throw new Error(`Azure DevOps pull request API error: ${getAzureDevOpsErrorMessage(error)}`);
  }

  const changeEntries = changePage.changeEntries ?? [];
  const files = (
    await Promise.all(
      changeEntries.map((change) =>
        hydrateChangedFile(client, change, repositoryId, projectId, hashes, request.includeContents === true),
      ),
    )
  ).filter((file): file is PullRequestChangedFile => file !== null);

  const nextSkip = typeof changePage.nextSkip === 'number' ? changePage.nextSkip : 0;
  const hasMore = nextSkip > 0;
  const knownCount = skip + files.length;

  let commits = mapCommits(pullRequest.commits);
  if (commits.length === 0) {
    try {
      commits = mapCommits(await gitApi.getPullRequestCommits(repositoryId, pullRequestId, projectId));
    } catch {
      commits = [];
    }
  }

  return {
    pullRequestId,
    title: typeof pullRequest.title === 'string' ? pullRequest.title : '',
    description:
      typeof pullRequest.description === 'string' && pullRequest.description.trim().length > 0
        ? pullRequest.description
        : null,
    status: normalizePullRequestStatus(pullRequest.status),
    author: getDisplayName(pullRequest.createdBy),
    createdDate: toIsoString(pullRequest.creationDate),
    closedDate: toIsoString(pullRequest.closedDate),
    sourceBranch: typeof pullRequest.sourceRefName === 'string' ? pullRequest.sourceRefName : '',
    targetBranch: typeof pullRequest.targetRefName === 'string' ? pullRequest.targetRefName : '',
    url: buildPullRequestUrl(pullRequest, projectId, repositoryId, pullRequestId, client.config.orgUrl),
    projectId,
    repositoryId,
    repositoryName:
      typeof pullRequest.repository?.name === 'string' && pullRequest.repository.name.trim().length > 0
        ? pullRequest.repository.name
        : null,
    hashes,
    reviewers: mapReviewers(pullRequest.reviewers),
    commits,
    workItemIds: mapWorkItemIds(pullRequest),
    iterationId,
    changes: {
      // Exact totals are only known when Azure reports no further pages.
      totalCount: knownCount,
      returnedCount: files.length,
      skip,
      top,
      hasMore,
      files,
    },
  };
}
