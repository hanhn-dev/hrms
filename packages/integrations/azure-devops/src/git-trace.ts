import {
  GitPullRequestQueryType,
  GitVersionType,
  LineDiffBlockChangeType,
  PullRequestStatus,
  VersionControlChangeType,
  VersionControlRecursionType,
  type GitChange,
  type GitCommitRef,
  type GitPullRequest,
  type GitVersionDescriptor,
  type LineDiffBlock,
} from 'azure-devops-node-api/interfaces/GitInterfaces.js';
import {
  getAzureDevOpsErrorMessage,
  withAzureDevOpsTimeout,
  type AzureDevOpsClient,
} from './client.js';

export const GIT_COMMIT_PAGE_SIZE = 50;
export const GIT_CHANGE_PAGE_SIZE = 100;
export const GIT_FILE_TEXT_LIMIT_BYTES = 100_000;

const HEADS_PREFIX = 'refs/heads/';
/** Azure DevOps matches `heads/` against `refs/heads/*`. A `refs/heads/` filter returns nothing. */
const HEADS_FILTER = 'heads/';

export type GitChangeType = 'add' | 'edit' | 'delete' | 'rename' | 'other';

export interface GitRepositorySummary {
  readonly id: string;
  readonly name: string;
  readonly defaultBranch: string | null;
  readonly webUrl: string | null;
}

export interface GitBranchSummary {
  readonly name: string;
  readonly commitId: string;
}

export interface GitCommitPullRequest {
  readonly id: number;
  readonly title: string | null;
}

export interface GitCommitSummary {
  readonly commitId: string;
  readonly comment: string | null;
  readonly authorName: string | null;
  readonly authorEmail: string | null;
  readonly authoredAt: string | null;
  readonly workItemIds: readonly number[];
  readonly pullRequest: GitCommitPullRequest | null;
}

export interface GitAuthorPullRequest {
  readonly id: number;
  readonly title: string;
  readonly status: string;
  readonly createdAt: string | null;
}

export interface GitAuthorActivity {
  readonly authorName: string;
  readonly commits: readonly GitCommitSummary[];
  readonly pullRequests: readonly GitAuthorPullRequest[];
}

export interface GitChangedFile {
  readonly path: string;
  readonly originalPath: string | null;
  readonly changeType: GitChangeType;
}

export interface GitCommitDetail extends GitCommitSummary {
  readonly parentCommitId: string | null;
  readonly files: readonly GitChangedFile[];
  readonly filesTruncated: boolean;
}

export interface GitCommitCompare {
  readonly baseCommitId: string;
  readonly targetCommitId: string;
  readonly commonCommitId: string | null;
  readonly aheadCount: number | null;
  readonly behindCount: number | null;
  readonly allChangesIncluded: boolean;
  readonly skip: number;
  readonly top: number;
  readonly files: readonly GitChangedFile[];
}

export interface GitLineDiffBlock {
  readonly changeType: 'none' | 'add' | 'delete' | 'edit';
  readonly originalLineNumberStart: number | null;
  readonly originalLinesCount: number | null;
  readonly modifiedLineNumberStart: number | null;
  readonly modifiedLinesCount: number | null;
}

export interface GitFileSide {
  readonly content: string | null;
  readonly missing: boolean;
  readonly isBinary: boolean;
  readonly truncated: boolean;
  readonly omission: string | null;
}

export interface GitFileVersion {
  readonly commitId: string | null;
  readonly path: string | null;
}

export interface GitFilePair {
  readonly base: GitFileSide;
  readonly target: GitFileSide;
  readonly lineDiffBlocks: readonly GitLineDiffBlock[];
}

export interface ListGitCommitsInput {
  readonly repositoryId: string;
  readonly branch: string;
  /** Empty or omitted lists the branch. A value limits history to that path. */
  readonly path?: string;
  /** Display name. Combined with `authors` when both are set. */
  readonly author?: string;
  /** Display names. Each name is queried, then the commits are merged. */
  readonly authors?: readonly string[];
  /**
   * When set, Azure DevOps returns commits on `branch` that are not on this branch.
   * Used with `path` to see who changed a file between two branches.
   */
  readonly compareBranch?: string;
  readonly skip?: number;
  readonly top?: number;
}

export interface GitCommitPage {
  readonly commits: readonly GitCommitSummary[];
  readonly skip: number;
  readonly top: number;
  /** True when every requested author stream returned a full page. */
  readonly hasMore: boolean;
}

export interface CompareGitCommitsInput {
  readonly repositoryId: string;
  readonly baseCommitId: string;
  readonly targetCommitId: string;
  readonly skip?: number;
  readonly top?: number;
}

export interface ReadGitFilePairInput {
  readonly repositoryId: string;
  readonly base: GitFileVersion;
  readonly target: GitFileVersion;
}

export interface ListGitAuthorActivityInput {
  readonly repositoryId: string;
  readonly authorName: string;
  readonly branch: string;
  /** Azure DevOps identity id. Pull requests are omitted when this is missing. */
  readonly creatorId?: string | null;
}

const EMPTY_SIDE: GitFileSide = {
  content: null,
  missing: true,
  isBinary: false,
  truncated: false,
  omission: null,
};

export async function listGitRepositories(client: AzureDevOpsClient): Promise<GitRepositorySummary[]> {
  const gitApi = await client.getGitApi();
  const repositories = await withAzureDevOpsTimeout(gitApi.getRepositories(client.config.project));
  const summaries: GitRepositorySummary[] = [];

  for (const repository of repositories ?? []) {
    const summary = mapRepository(repository);
    if (summary !== null) {
      summaries.push(summary);
    }
  }

  summaries.sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: 'base' }));
  return summaries;
}

export async function listGitBranches(
  client: AzureDevOpsClient,
  repositoryId: string,
): Promise<GitBranchSummary[]> {
  const resolvedRepositoryId = requireText(repositoryId, 'Repository');
  const gitApi = await client.getGitApi();
  const refs = await withAzureDevOpsTimeout(
    gitApi.getRefs(resolvedRepositoryId, client.config.project, HEADS_FILTER),
  );
  const branches: GitBranchSummary[] = [];

  for (const ref of refs ?? []) {
    const name = branchName(ref.name);
    const commitId = ref.objectId?.trim();
    if (name === null || name.length === 0 || commitId === undefined || commitId.length === 0) {
      continue;
    }
    branches.push({ name, commitId });
  }

  branches.sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: 'base' }));
  return branches;
}

export async function listGitFiles(
  client: AzureDevOpsClient,
  repositoryId: string,
  branch: string,
): Promise<string[]> {
  const resolvedRepositoryId = requireText(repositoryId, 'Repository');
  const resolvedBranch = normalizeBranchName(branch);
  if (resolvedBranch.length === 0) {
    throw new Error('Branch is required');
  }

  const gitApi = await client.getGitApi();
  const items = await withAzureDevOpsTimeout(
    gitApi.getItems(
      resolvedRepositoryId,
      client.config.project,
      '/',
      VersionControlRecursionType.Full,
      false,
      false,
      false,
      false,
      { version: resolvedBranch, versionType: GitVersionType.Branch },
    ),
  );

  const paths = new Set<string>();
  for (const item of items ?? []) {
    if (item.isFolder === true) {
      continue;
    }
    const path = formatPath(item.path);
    if (path === null || path === '/') {
      continue;
    }
    paths.add(path);
  }

  return [...paths].sort((left, right) => left.localeCompare(right, undefined, { sensitivity: 'base' }));
}

export async function listGitCommits(
  client: AzureDevOpsClient,
  input: ListGitCommitsInput,
): Promise<GitCommitPage> {
  const repositoryId = requireText(input.repositoryId, 'Repository');
  const branch = normalizeBranchName(input.branch);
  if (branch.length === 0) {
    throw new Error('Branch is required');
  }

  const top = clampPositive(input.top, GIT_COMMIT_PAGE_SIZE, GIT_COMMIT_PAGE_SIZE);
  const skip = clampSkip(input.skip);
  const path = optionalGitPath(input.path);
  const compareBranch = input.compareBranch === undefined ? '' : normalizeBranchName(input.compareBranch);
  const names = authorNames(input);
  const pages =
    names.length === 0
      ? [await fetchCommitPage(client, repositoryId, branch, path, compareBranch, undefined, skip, top)]
      : await Promise.all(
          names.map((name) =>
            fetchCommitPage(client, repositoryId, branch, path, compareBranch, name, skip, top),
          ),
        );

  return {
    commits: await attachPullRequests(client, repositoryId, mergeCommits(pages.flat())),
    skip,
    top,
    hasMore: pages.some((page) => page.length >= top),
  };
}

async function fetchCommitPage(
  client: AzureDevOpsClient,
  repositoryId: string,
  branch: string,
  path: string | undefined,
  compareBranch: string,
  author: string | undefined,
  skip: number,
  top: number,
): Promise<GitCommitSummary[]> {
  const criteria = {
    includeWorkItems: true,
    $top: top,
    ...(skip > 0 ? { $skip: skip } : {}),
    itemVersion: branchVersion(branch),
    ...(path === undefined ? {} : { itemPath: path }),
    ...(author === undefined ? {} : { author }),
    ...(compareBranch.length === 0 ? {} : { compareVersion: branchVersion(compareBranch) }),
  };
  const gitApi = await client.getGitApi();
  const commits = await withAzureDevOpsTimeout(
    gitApi.getCommits(repositoryId, criteria, client.config.project, skip, top),
  );
  return (commits ?? []).map(mapCommit).filter((commit): commit is GitCommitSummary => commit !== null);
}

export async function listGitAuthorActivity(
  client: AzureDevOpsClient,
  input: ListGitAuthorActivityInput,
): Promise<GitAuthorActivity> {
  const repositoryId = requireText(input.repositoryId, 'Repository');
  const authorName = requireText(input.authorName, 'Author');
  const branch = normalizeBranchName(input.branch);
  const commits =
    branch.length === 0
      ? []
      : (await listGitCommits(client, { repositoryId, branch, author: authorName })).commits;
  const creatorId = optionalText(input.creatorId ?? undefined);
  if (creatorId === undefined) {
    return { authorName, commits, pullRequests: [] };
  }

  const gitApi = await client.getGitApi();
  const rows = await withAzureDevOpsTimeout(
    gitApi.getPullRequests(
      repositoryId,
      { creatorId, status: PullRequestStatus.All },
      client.config.project,
      undefined,
      0,
      GIT_COMMIT_PAGE_SIZE,
    ),
  );

  const pullRequests = (rows ?? [])
    .map(mapAuthorPullRequest)
    .filter((pullRequest): pullRequest is GitAuthorPullRequest => pullRequest !== null)
    .sort((left, right) => (right.createdAt ?? '').localeCompare(left.createdAt ?? ''));

  return { authorName, commits, pullRequests };
}

export async function getGitCommitDetail(
  client: AzureDevOpsClient,
  repositoryId: string,
  commitId: string,
): Promise<GitCommitDetail> {
  const resolvedRepositoryId = requireText(repositoryId, 'Repository');
  const resolvedCommitId = requireCommitId(commitId, 'Commit');
  const gitApi = await client.getGitApi();
  const [commit, changes] = await Promise.all([
    withAzureDevOpsTimeout(gitApi.getCommit(resolvedCommitId, resolvedRepositoryId, client.config.project, 0)),
    withAzureDevOpsTimeout(
      gitApi.getChanges(resolvedCommitId, resolvedRepositoryId, client.config.project, GIT_CHANGE_PAGE_SIZE, 0),
    ),
  ]);
  const summary = mapCommit(commit);
  if (summary === null) {
    throw new Error(`Commit ${resolvedCommitId} was not found`);
  }

  const files = mapChangedFiles(changes?.changes);
  const [withPullRequest] = await attachPullRequests(client, resolvedRepositoryId, [summary]);
  return {
    ...(withPullRequest ?? summary),
    parentCommitId: firstParent(commit?.parents),
    files,
    filesTruncated: (changes?.changes?.length ?? 0) >= GIT_CHANGE_PAGE_SIZE,
  };
}

export async function compareGitCommits(
  client: AzureDevOpsClient,
  input: CompareGitCommitsInput,
): Promise<GitCommitCompare> {
  const repositoryId = requireText(input.repositoryId, 'Repository');
  const baseCommitId = requireCommitId(input.baseCommitId, 'Base commit');
  const targetCommitId = requireCommitId(input.targetCommitId, 'Target commit');
  const top = clampPositive(input.top, GIT_CHANGE_PAGE_SIZE, GIT_CHANGE_PAGE_SIZE);
  const skip = clampSkip(input.skip);
  const gitApi = await client.getGitApi();
  const diffs = await withAzureDevOpsTimeout(
    gitApi.getCommitDiffs(
      repositoryId,
      client.config.project,
      false,
      top,
      skip,
      { version: baseCommitId, versionType: GitVersionType.Commit },
      { version: targetCommitId, versionType: GitVersionType.Commit },
    ),
  );
  const files = mapChangedFiles(diffs?.changes);

  return {
    baseCommitId: diffs?.baseCommit?.trim() || baseCommitId,
    targetCommitId: diffs?.targetCommit?.trim() || targetCommitId,
    commonCommitId: optionalText(diffs?.commonCommit) ?? null,
    aheadCount: typeof diffs?.aheadCount === 'number' ? diffs.aheadCount : null,
    behindCount: typeof diffs?.behindCount === 'number' ? diffs.behindCount : null,
    allChangesIncluded: diffs?.allChangesIncluded ?? files.length < top,
    skip,
    top,
    files,
  };
}

export async function readGitFilePair(
  client: AzureDevOpsClient,
  input: ReadGitFilePairInput,
): Promise<GitFilePair> {
  const repositoryId = requireText(input.repositoryId, 'Repository');
  const base = normalizeVersion(input.base);
  const target = normalizeVersion(input.target);
  const [baseSide, targetSide] = await Promise.all([
    readFileSide(client, repositoryId, base),
    readFileSide(client, repositoryId, target),
  ]);

  return {
    base: baseSide,
    target: targetSide,
    lineDiffBlocks: await readLineDiffBlocks(client, repositoryId, base, target),
  };
}

function mapRepository(repository: {
  id?: string;
  name?: string;
  defaultBranch?: string;
  webUrl?: string;
}): GitRepositorySummary | null {
  const id = repository.id?.trim();
  const name = repository.name?.trim();
  if (id === undefined || id.length === 0 || name === undefined || name.length === 0) {
    return null;
  }

  return {
    id,
    name,
    defaultBranch: branchName(repository.defaultBranch) ?? optionalText(repository.defaultBranch) ?? null,
    webUrl: optionalText(repository.webUrl) ?? null,
  };
}

function mapCommit(commit: GitCommitRef | undefined | null): GitCommitSummary | null {
  const commitId = commit?.commitId?.trim();
  if (commit === undefined || commit === null || commitId === undefined || commitId.length === 0) {
    return null;
  }

  const authorName = optionalText(commit.author?.name) ?? optionalText(commit.author?.email) ?? null;
  const comment = optionalText(commit.comment) ?? null;
  return {
    commitId,
    comment,
    authorName,
    authorEmail: optionalText(commit.author?.email) ?? null,
    authoredAt: toIso(commit.author?.date),
    workItemIds: mapWorkItemIds(commit),
    pullRequest: pullRequestFromComment(comment),
  };
}

const MERGED_PULL_REQUEST = /^Merged PR (\d+)\s*:\s*([^\n]*)/i;

function pullRequestFromComment(comment: string | null): GitCommitPullRequest | null {
  if (comment === null) {
    return null;
  }
  const match = MERGED_PULL_REQUEST.exec(comment);
  const id = match?.[1] === undefined ? null : safeId(match[1]);
  if (id === null) {
    return null;
  }
  const title = match?.[2]?.trim();
  return { id, title: title !== undefined && title.length > 0 ? title : null };
}

function authorNames(input: ListGitCommitsInput): string[] {
  const names = new Set<string>();
  const single = optionalText(input.author);
  if (single !== undefined) {
    names.add(single);
  }
  for (const name of input.authors ?? []) {
    const trimmed = name.trim();
    if (trimmed.length > 0) {
      names.add(trimmed);
    }
  }
  return [...names];
}

function mergeCommits(commits: readonly GitCommitSummary[]): GitCommitSummary[] {
  const byId = new Map<string, GitCommitSummary>();
  for (const commit of commits) {
    byId.set(commit.commitId, commit);
  }
  return [...byId.values()].sort((left, right) =>
    (right.authoredAt ?? '').localeCompare(left.authoredAt ?? ''),
  );
}

async function attachPullRequests(
  client: AzureDevOpsClient,
  repositoryId: string,
  commits: readonly GitCommitSummary[],
): Promise<GitCommitSummary[]> {
  if (commits.length === 0) {
    return [];
  }
  const gitApi = await client.getGitApi();
  let lastMerge: { [key: string]: GitPullRequest[] } | undefined;
  let contained: { [key: string]: GitPullRequest[] } | undefined;
  try {
    const query = await withAzureDevOpsTimeout(
      gitApi.getPullRequestQuery(
        {
          queries: [
            { type: GitPullRequestQueryType.LastMergeCommit, items: commits.map((commit) => commit.commitId) },
            { type: GitPullRequestQueryType.Commit, items: commits.map((commit) => commit.commitId) },
          ],
        },
        repositoryId,
        client.config.project,
      ),
    );
    lastMerge = query.results?.[0];
    contained = query.results?.[1];
  } catch {
    return [...commits];
  }

  return commits.map((commit) => {
    const fromApi =
      firstPullRequest(rowsForCommit(lastMerge, commit.commitId)) ??
      firstPullRequest(rowsForCommit(contained, commit.commitId));
    return fromApi === null ? commit : { ...commit, pullRequest: fromApi };
  });
}

function rowsForCommit(
  dictionary: { [key: string]: GitPullRequest[] } | undefined,
  commitId: string,
): readonly GitPullRequest[] | undefined {
  if (dictionary === undefined) {
    return undefined;
  }
  const direct = dictionary[commitId];
  if (direct !== undefined) {
    return direct;
  }
  const lower = commitId.toLowerCase();
  for (const [key, rows] of Object.entries(dictionary)) {
    if (key.toLowerCase() === lower) {
      return rows;
    }
  }
  return undefined;
}

function firstPullRequest(rows: readonly GitPullRequest[] | undefined): GitCommitPullRequest | null {
  for (const row of rows ?? []) {
    const mapped = mapPullRequestRef(row);
    if (mapped !== null) {
      return mapped;
    }
  }
  return null;
}

function mapPullRequestRef(pullRequest: GitPullRequest): GitCommitPullRequest | null {
  const id = pullRequest.pullRequestId;
  if (id === undefined || !Number.isSafeInteger(id) || id <= 0) {
    return null;
  }
  const title = pullRequest.title?.trim();
  return { id, title: title !== undefined && title.length > 0 ? title : null };
}

function mapAuthorPullRequest(pullRequest: GitPullRequest): GitAuthorPullRequest | null {
  const ref = mapPullRequestRef(pullRequest);
  if (ref === null) {
    return null;
  }
  return {
    id: ref.id,
    title: ref.title ?? `Pull request ${ref.id}`,
    status: pullRequestStatusLabel(pullRequest.status),
    createdAt: toIso(pullRequest.creationDate),
  };
}

function pullRequestStatusLabel(status: PullRequestStatus | undefined): string {
  switch (status) {
    case PullRequestStatus.Active:
      return 'Active';
    case PullRequestStatus.Completed:
      return 'Completed';
    case PullRequestStatus.Abandoned:
      return 'Abandoned';
    default:
      return 'Unknown';
  }
}

function mapWorkItemIds(commit: GitCommitRef): number[] {
  const ids = new Set<number>();
  for (const reference of commit.workItems ?? []) {
    const id = parseWorkItemId(reference.id, reference.url);
    if (id !== null) {
      ids.add(id);
    }
  }
  return [...ids].sort((left, right) => left - right);
}

function parseWorkItemId(id: string | undefined, url: string | undefined): number | null {
  if (typeof id === 'string' && /^[1-9]\d*$/.test(id)) {
    return safeId(id);
  }
  const match = url?.match(/\/workItems\/(\d+)(?:\?|$)/i);
  return match?.[1] === undefined ? null : safeId(match[1]);
}

function safeId(value: string): number | null {
  const parsed = Number.parseInt(value, 10);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function mapChangedFiles(changes: readonly GitChange[] | undefined): GitChangedFile[] {
  const files: GitChangedFile[] = [];
  for (const change of changes ?? []) {
    const file = mapChangedFile(change);
    if (file !== null) {
      files.push(file);
    }
  }
  return files;
}

function mapChangedFile(change: GitChange): GitChangedFile | null {
  if (change.item?.isFolder === true) {
    return null;
  }

  const changeType = normalizeGitChangeType(change.changeType);
  const path = formatPath(change.item?.path ?? change.sourceServerItem);
  if (path === null) {
    return null;
  }

  let originalPath = formatPath(change.originalPath);
  if (originalPath === null && changeType === 'rename') {
    originalPath = formatPath(change.sourceServerItem);
  }
  if (originalPath === path) {
    originalPath = null;
  }

  return { path, originalPath, changeType };
}

export function normalizeGitChangeType(changeType: VersionControlChangeType | undefined): GitChangeType {
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

function hasChangeFlag(changeType: VersionControlChangeType | undefined, flag: VersionControlChangeType): boolean {
  if (changeType === undefined) {
    return false;
  }
  return (changeType & flag) === flag;
}

function firstParent(parents: readonly string[] | undefined): string | null {
  for (const parent of parents ?? []) {
    const trimmed = parent.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }
  return null;
}

async function readFileSide(
  client: AzureDevOpsClient,
  repositoryId: string,
  version: GitFileVersion,
): Promise<GitFileSide> {
  if (version.commitId === null || version.path === null) {
    return EMPTY_SIDE;
  }

  const gitApi = await client.getGitApi();
  const descriptor = { version: version.commitId, versionType: GitVersionType.Commit };

  try {
    const item = await withAzureDevOpsTimeout(
      gitApi.getItem(
        repositoryId,
        version.path,
        client.config.project,
        undefined,
        undefined,
        true,
        false,
        false,
        descriptor,
        false,
      ),
    );

    if (item === undefined || item === null) {
      return EMPTY_SIDE;
    }
    if (item.isFolder === true) {
      return omitted('Folder omitted');
    }
    if (item.contentMetadata?.isBinary === true) {
      return omitted('Binary or non-text content omitted', true);
    }

    const contentStream = await withAzureDevOpsTimeout(
      gitApi.getItemContent(
        repositoryId,
        version.path,
        client.config.project,
        undefined,
        undefined,
        true,
        false,
        false,
        descriptor,
        true,
      ),
    );
    const rawContent = await withAzureDevOpsTimeout(streamToString(contentStream));
    const truncated = truncateText(rawContent);
    return {
      content: truncated.content,
      missing: false,
      isBinary: false,
      truncated: truncated.truncated,
      omission: null,
    };
  } catch (error) {
    if (isBinaryContentError(error)) {
      return omitted('Binary or non-text content omitted', true);
    }
    if (isMissingItemError(error)) {
      return EMPTY_SIDE;
    }
    return {
      content: null,
      missing: false,
      isBinary: false,
      truncated: false,
      omission: `Unable to read file content: ${getAzureDevOpsErrorMessage(error)}`,
    };
  }
}

async function readLineDiffBlocks(
  client: AzureDevOpsClient,
  repositoryId: string,
  base: GitFileVersion,
  target: GitFileVersion,
): Promise<GitLineDiffBlock[]> {
  if (base.commitId === null || target.commitId === null || base.path === null || target.path === null) {
    return [];
  }

  const gitApi = await client.getGitApi();

  try {
    const diffs = await withAzureDevOpsTimeout(
      gitApi.getFileDiffs(
        {
          baseVersionCommit: base.commitId,
          targetVersionCommit: target.commitId,
          fileDiffParams: [{ path: target.path, originalPath: base.path }],
        },
        client.config.project,
        repositoryId,
      ),
    );
    return mapLineDiffBlocks(diffs?.[0]?.lineDiffBlocks);
  } catch {
    return [];
  }
}

function mapLineDiffBlocks(blocks: readonly LineDiffBlock[] | undefined): GitLineDiffBlock[] {
  return (blocks ?? []).map((block) => ({
    changeType: normalizeLineDiffChangeType(block.changeType),
    originalLineNumberStart: typeof block.originalLineNumberStart === 'number' ? block.originalLineNumberStart : null,
    originalLinesCount: typeof block.originalLinesCount === 'number' ? block.originalLinesCount : null,
    modifiedLineNumberStart: typeof block.modifiedLineNumberStart === 'number' ? block.modifiedLineNumberStart : null,
    modifiedLinesCount: typeof block.modifiedLinesCount === 'number' ? block.modifiedLinesCount : null,
  }));
}

function normalizeLineDiffChangeType(changeType: LineDiffBlockChangeType | undefined): GitLineDiffBlock['changeType'] {
  switch (changeType) {
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

function omitted(omission: string, isBinary = false): GitFileSide {
  return {
    content: null,
    missing: false,
    isBinary,
    truncated: false,
    omission,
  };
}

function normalizeVersion(version: GitFileVersion): GitFileVersion {
  const commitId = optionalText(version.commitId ?? undefined);
  const path = version.path === null || version.path === undefined ? null : optionalGitPath(version.path) ?? null;
  if (commitId === undefined || path === null) {
    return { commitId: null, path: null };
  }
  return { commitId: requireCommitId(commitId, 'Commit'), path };
}

function branchVersion(branch: string): GitVersionDescriptor {
  return { version: branch, versionType: GitVersionType.Branch };
}

function branchName(refName: string | undefined): string | null {
  const trimmed = refName?.trim();
  if (trimmed === undefined || trimmed.length === 0) {
    return null;
  }
  if (trimmed.startsWith(HEADS_PREFIX)) {
    return trimmed.slice(HEADS_PREFIX.length);
  }
  return null;
}

function normalizeBranchName(branch: string): string {
  const trimmed = branch.trim();
  if (trimmed.startsWith(HEADS_PREFIX)) {
    return trimmed.slice(HEADS_PREFIX.length);
  }
  return trimmed;
}

function optionalGitPath(path: string | undefined): string | undefined {
  const trimmed = path?.trim();
  if (trimmed === undefined || trimmed.length === 0) {
    return undefined;
  }
  const slashed = trimmed.replace(/\\/g, '/');
  return slashed.startsWith('/') ? slashed : `/${slashed}`;
}

function formatPath(path: string | undefined): string | null {
  return optionalGitPath(path) ?? null;
}

function optionalText(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed === undefined || trimmed.length === 0 ? undefined : trimmed;
}

function requireText(value: string, label: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new Error(`${label} is required`);
  }
  return trimmed;
}

function requireCommitId(value: string, label: string): string {
  const trimmed = value.trim();
  if (!/^[0-9a-f]{7,40}$/i.test(trimmed)) {
    throw new Error(`${label} must be a Git commit id`);
  }
  return trimmed;
}

function clampPositive(value: number | undefined, fallback: number, max: number): number {
  if (value === undefined || !Number.isFinite(value)) {
    return fallback;
  }
  const floored = Math.floor(value);
  if (floored < 1) {
    return fallback;
  }
  return Math.min(floored, max);
}

function clampSkip(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value) || value < 0) {
    return 0;
  }
  return Math.floor(value);
}

function toIso(value: Date | string | undefined): string | null {
  if (value === undefined) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
}

function truncateText(value: string): { content: string; truncated: boolean } {
  const bytes = Buffer.byteLength(value, 'utf8');
  if (bytes <= GIT_FILE_TEXT_LIMIT_BYTES) {
    return { content: value, truncated: false };
  }

  let end = Math.min(value.length, GIT_FILE_TEXT_LIMIT_BYTES);
  while (end > 0 && Buffer.byteLength(value.slice(0, end), 'utf8') > GIT_FILE_TEXT_LIMIT_BYTES) {
    end -= 1;
  }

  return { content: value.slice(0, end), truncated: true };
}

function isMissingItemError(error: unknown): boolean {
  if (errorStatus(error) === 404) {
    return true;
  }
  const message = getAzureDevOpsErrorMessage(error).toLowerCase();
  return /could not be found|does not exist|not found|\b404\b/.test(message);
}

function isBinaryContentError(error: unknown): boolean {
  return /binary content detected/i.test(getAzureDevOpsErrorMessage(error));
}

function errorStatus(error: unknown): number | null {
  if (typeof error !== 'object' || error === null || !('statusCode' in error)) {
    return null;
  }
  const statusCode = (error as { statusCode?: unknown }).statusCode;
  return typeof statusCode === 'number' ? statusCode : null;
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
