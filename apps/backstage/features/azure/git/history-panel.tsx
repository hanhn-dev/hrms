"use client";

import { SearchOutlined } from "@ant-design/icons";
import { Alert, Button, Spin, Table } from "antd";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import type {
  GitBranchSummary,
  GitChangedFile,
  GitCommitDetail,
  GitCommitPullRequest,
  GitCommitSummary,
  GitFilePair,
  TeamMember,
} from "@hrms/azure-devops";
import { AuthorActivityModal } from "@/features/azure/git/author-activity-modal";
import { CommitDetailDrawer } from "@/features/azure/git/commit-detail-drawer";
import { buildGitCommitUrl, buildGitPullRequestUrl, buildGitWorkItemUrl } from "@/features/azure/git/git-links";
import { GitPathSearch } from "@/features/azure/git/git-path-search";
import { displayGitPath, errorMessage, firstCommitLine, rethrowRedirect, shortCommit } from "@/features/azure/git/git-text";
import { loadGitCommitDetail, loadGitCommits, loadGitFilePair } from "@/features/azure/git/queries";
import { rememberRecentGitPath, type RecentGitPath } from "@/features/azure/git/recent-git-paths";
import { formatDate } from "@/shared/format-date";
import { SearchSelect } from "@/shared/ui";

const DEFAULT_BODY_HEIGHT = 480;

function preferredHistoryBranch(
  current: string,
  branches: readonly GitBranchSummary[],
  defaultBranch: string | null,
): string {
  if (current && branches.some((item) => item.name === current)) {
    return current;
  }
  if (defaultBranch && branches.some((item) => item.name === defaultBranch)) {
    return defaultBranch;
  }
  return branches[0]?.name ?? "";
}

function useTableBodyHeight(): { ref: React.RefObject<HTMLDivElement | null>; bodyHeight: number } {
  const ref = useRef<HTMLDivElement>(null);
  const [bodyHeight, setBodyHeight] = useState(DEFAULT_BODY_HEIGHT);

  useEffect(() => {
    const node = ref.current;
    if (!node) {
      return;
    }
    const measure = (): void => {
      const header = node.querySelector<HTMLElement>(".ant-table-header");
      const headerHeight = header?.offsetHeight ?? 39;
      setBodyHeight(Math.max(160, node.clientHeight - headerHeight));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return { ref, bodyHeight };
}

export function HistoryPanel({
  repositoryId,
  repositoryName,
  organizationUrl,
  project,
  defaultBranch,
  branches,
  branchesLoading,
  authors,
}: {
  repositoryId: string;
  repositoryName: string;
  organizationUrl: string;
  project: string;
  defaultBranch: string | null;
  branches: readonly GitBranchSummary[];
  branchesLoading: boolean;
  authors: readonly TeamMember[];
}): React.JSX.Element {
  const [branch, setBranch] = useState("");
  const [draftPath, setDraftPath] = useState("");
  const [draftAuthors, setDraftAuthors] = useState<string[]>([]);
  const [path, setPath] = useState("");
  const [selectedAuthors, setSelectedAuthors] = useState<string[]>([]);
  const [searchTick, setSearchTick] = useState(0);
  const [commits, setCommits] = useState<GitCommitSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<GitCommitDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [pair, setPair] = useState<GitFilePair | null>(null);
  const [pairLoading, setPairLoading] = useState(false);
  const [pairError, setPairError] = useState<string | null>(null);
  const [activityAuthor, setActivityAuthor] = useState<string | null>(null);
  const [appliedBranches, setAppliedBranches] = useState<readonly GitBranchSummary[] | null>(null);
  const [appliedDefaultBranch, setAppliedDefaultBranch] = useState<string | null | undefined>(undefined);
  const [loadedHistory, setLoadedHistory] = useState({
    repositoryId,
    branch,
    path,
    authors: selectedAuthors,
    searchTick,
  });
  const { ref: tableFrame, bodyHeight } = useTableBodyHeight();
  const commitsRef = useRef<GitCommitSummary[]>([]);
  const nextSkipRef = useRef(0);
  const hasMoreRef = useRef(false);
  const loadingMoreRef = useRef(false);
  const requestIdRef = useRef(0);
  const queryRef = useRef({ repositoryId, branch, path, authors: selectedAuthors });

  const authorOptions = uniqueAuthorOptions(authors);
  let activeBranch = branch;
  if (branches.length > 0 && (branches !== appliedBranches || defaultBranch !== appliedDefaultBranch)) {
    setAppliedBranches(branches);
    setAppliedDefaultBranch(defaultBranch);
    activeBranch = preferredHistoryBranch(branch, branches, defaultBranch);
    if (activeBranch !== branch) {
      setBranch(activeBranch);
    }
  }
  if (
    activeBranch.length > 0 &&
    (repositoryId !== loadedHistory.repositoryId ||
      activeBranch !== loadedHistory.branch ||
      path !== loadedHistory.path ||
      selectedAuthors !== loadedHistory.authors ||
      searchTick !== loadedHistory.searchTick)
  ) {
    setLoadedHistory({
      repositoryId,
      branch: activeBranch,
      path,
      authors: selectedAuthors,
      searchTick,
    });
    setLoading(true);
    setLoadingMore(false);
    setHasMore(false);
    setError(null);
  }

  useEffect(() => {
    queryRef.current = { repositoryId, branch, path, authors: selectedAuthors };
  });

  useEffect(() => {
    if (!branch) {
      return;
    }
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    loadingMoreRef.current = false;
    hasMoreRef.current = false;
    nextSkipRef.current = 0;
    loadGitCommits({ repositoryId, branch, path, authors: selectedAuthors, skip: 0 })
      .then((page) => {
        if (requestIdRef.current !== requestId) {
          return;
        }
        commitsRef.current = [...page.commits];
        setCommits(commitsRef.current);
        hasMoreRef.current = page.hasMore;
        nextSkipRef.current = page.skip + page.top;
        setHasMore(page.hasMore);
        if (displayGitPath(path).length > 0) {
          rememberRecentGitPath(repositoryId, { path, historyBranch: branch });
        }
      })
      .catch((loadError: unknown) => {
        rethrowRedirect(loadError);
        if (requestIdRef.current !== requestId) {
          return;
        }
        setError(errorMessage(loadError));
        commitsRef.current = [];
        setCommits([]);
      })
      .finally(() => {
        if (requestIdRef.current === requestId) {
          setLoading(false);
        }
      });
  }, [repositoryId, branch, path, selectedAuthors, searchTick]);

  const loadMore = useEffectEvent(async (): Promise<void> => {
    if (!hasMoreRef.current || loadingMoreRef.current) {
      return;
    }
    const requestId = requestIdRef.current;
    const query = queryRef.current;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const page = await loadGitCommits({
        repositoryId: query.repositoryId,
        branch: query.branch,
        path: query.path,
        authors: query.authors,
        skip: nextSkipRef.current,
      });
      if (requestIdRef.current !== requestId) {
        return;
      }
      const merged = appendCommits(commitsRef.current, page.commits);
      const grew = merged.length > commitsRef.current.length;
      commitsRef.current = merged;
      setCommits(merged);
      const more = page.hasMore && grew;
      hasMoreRef.current = more;
      nextSkipRef.current = page.skip + page.top;
      setHasMore(more);
    } catch (loadError) {
      rethrowRedirect(loadError);
      if (requestIdRef.current === requestId) {
        setError(errorMessage(loadError));
        hasMoreRef.current = false;
        setHasMore(false);
      }
    } finally {
      if (requestIdRef.current === requestId) {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      }
    }
  });

  useEffect(() => {
    const body = tableFrame.current?.querySelector(".ant-table-body");
    if (!body) {
      return;
    }
    const onScroll = (): void => {
      if (body.clientHeight === 0) {
        return;
      }
      const remaining = body.scrollHeight - body.scrollTop - body.clientHeight;
      if (remaining <= 80) {
        void loadMore();
      }
    };
    body.addEventListener("scroll", onScroll);
    onScroll();
    return () => body.removeEventListener("scroll", onScroll);
  }, [commits.length, bodyHeight, loading, tableFrame]);

  function applyFilters(nextAuthors: readonly string[] = draftAuthors, nextPath: string = draftPath): void {
    const filePath = displayGitPath(nextPath);
    setDraftPath(filePath);
    setPath(filePath);
    setSelectedAuthors([...nextAuthors]);
    setSearchTick((value) => value + 1);
  }

  function selectRecent(recent: RecentGitPath): void {
    setDraftPath(recent.path);
    if (recent.historyBranch && branches.some((item) => item.name === recent.historyBranch)) {
      setBranch(recent.historyBranch);
    }
  }

  async function openCommit(commit: GitCommitSummary): Promise<void> {
    setDetailOpen(true);
    setDetailLoading(true);
    setPair(null);
    setSelectedPath(null);
    setPairError(null);
    try {
      setDetail(await loadGitCommitDetail(repositoryId, commit.commitId));
    } catch (loadError) {
      rethrowRedirect(loadError);
      setError(errorMessage(loadError));
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  }

  async function openFile(file: GitChangedFile): Promise<void> {
    if (!detail) {
      return;
    }
    setSelectedPath(file.path);
    setPairLoading(true);
    setPairError(null);
    const basePath = file.changeType === "add" ? null : (file.originalPath ?? file.path);
    const targetPath = file.changeType === "delete" ? null : file.path;
    try {
      setPair(
        await loadGitFilePair({
          repositoryId,
          base: { commitId: basePath === null ? null : detail.parentCommitId, path: basePath },
          target: { commitId: targetPath === null ? null : detail.commitId, path: targetPath },
        }),
      );
    } catch (loadError) {
      rethrowRedirect(loadError);
      setPairError(errorMessage(loadError));
      setPair(null);
    } finally {
      setPairLoading(false);
    }
  }

  const creatorId =
    activityAuthor === null
      ? null
      : (authors.find((member) => member.displayName === activityAuthor)?.id ?? null);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex shrink-0 flex-wrap items-end gap-2">
        <label className="block min-w-52">
          <span className="mb-1 block text-sm text-slate-600 dark:text-slate-300">Branch</span>
          <SearchSelect
            aria-label="Branch"
            className="w-full"
            loading={branchesLoading}
            options={branches.map((item) => ({ value: item.name, label: item.name }))}
            placeholder="Branch"
            value={branch || undefined}
            onChange={(value) => setBranch(String(value))}
          />
        </label>
        <label className="block min-w-52 flex-1">
          <span className="mb-1 block text-sm text-slate-600 dark:text-slate-300">Path</span>
          <GitPathSearch
            branches={branches}
            branchesLoading={branchesLoading}
            fallbackBranch={branch}
            repositoryId={repositoryId}
            value={draftPath}
            onChange={setDraftPath}
            onPressEnter={(nextPath) => {
              applyFilters(draftAuthors, nextPath);
            }}
            onSelectRecent={selectRecent}
          />
        </label>
        <label className="block min-w-64 flex-1">
          <span className="mb-1 block text-sm text-slate-600 dark:text-slate-300">Authors</span>
          <SearchSelect
            allowClear
            aria-label="Authors"
            className="w-full"
            mode="multiple"
            options={authorOptions}
            placeholder="Team member"
            value={draftAuthors}
            onChange={(value) => {
              const names = (value ?? []).map(String);
              setDraftAuthors(names);
              applyFilters(names);
            }}
          />
        </label>
        <Button
          icon={<SearchOutlined />}
          loading={loading}
          type="primary"
          onClick={() => {
            applyFilters();
          }}
        >
          Trace
        </Button>
      </div>
      {error ? <Alert title={error} type="error" /> : null}
      <div ref={tableFrame} className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <Table<GitCommitSummary>
          columns={[
            {
              title: "Commit",
              dataIndex: "commitId",
              width: 110,
              render: (commitId: string) => (
                <a
                  href={buildGitCommitUrl({
                    organizationUrl,
                    project,
                    repositoryName,
                    commitId,
                  })}
                  rel="noreferrer"
                  target="_blank"
                  title={commitId}
                  onClick={(event) => event.stopPropagation()}
                >
                  {shortCommit(commitId)}
                </a>
              ),
            },
            {
              title: "Author",
              dataIndex: "authorName",
              width: 180,
              render: (name: string | null) =>
                name === null ? (
                  "—"
                ) : (
                  <button
                    className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setActivityAuthor(name);
                    }}
                  >
                    {name}
                  </button>
                ),
            },
            {
              title: "When",
              dataIndex: "authoredAt",
              width: 190,
              render: (value: string | null) => formatDate(value),
            },
            {
              title: "Message",
              dataIndex: "comment",
              render: (comment: string | null) => firstCommitLine(comment),
            },
            {
              title: "PR",
              dataIndex: "pullRequest",
              width: 90,
              render: (pullRequest: GitCommitPullRequest | null) =>
                pullRequest === null ? (
                  "—"
                ) : (
                  <a
                    href={buildGitPullRequestUrl({
                      organizationUrl,
                      project,
                      repositoryName,
                      pullRequestId: pullRequest.id,
                    })}
                    rel="noreferrer"
                    target="_blank"
                    title={pullRequest.title ?? undefined}
                    onClick={(event) => event.stopPropagation()}
                  >
                    {pullRequest.id}
                  </a>
                ),
            },
            {
              title: "Work items",
              dataIndex: "workItemIds",
              width: 140,
              render: (ids: readonly number[]) =>
                ids.length === 0 ? (
                  "—"
                ) : (
                  <span className="flex flex-wrap gap-2">
                    {ids.map((id) => (
                      <a
                        href={buildGitWorkItemUrl(organizationUrl, project, id)}
                        key={id}
                        rel="noreferrer"
                        target="_blank"
                        onClick={(event) => event.stopPropagation()}
                      >
                        {id}
                      </a>
                    ))}
                  </span>
                ),
            },
          ]}
          dataSource={commits}
          loading={loading && commits.length === 0}
          pagination={false}
          rowKey="commitId"
          scroll={{ y: Math.max(120, bodyHeight - (loadingMore ? 40 : 0)) }}
          size="small"
          onRow={(record) => ({
            onClick: () => {
              void openCommit(record);
            },
          })}
          rowClassName={(record) =>
            record.commitId === detail?.commitId ? "cursor-pointer bg-slate-100 dark:bg-slate-800" : "cursor-pointer"
          }
        />
        {loadingMore ? (
          <div className="flex h-10 shrink-0 items-center justify-center gap-2 border-t border-slate-200 bg-white text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900">
            <Spin size="small" />
            Loading more commits…
          </div>
        ) : null}
      </div>
      <CommitDetailDrawer
        detail={detail}
        loading={detailLoading}
        open={detailOpen}
        organizationUrl={organizationUrl}
        pair={pair}
        pairError={pairError}
        pairLoading={pairLoading}
        project={project}
        repositoryName={repositoryName}
        selectedPath={selectedPath}
        onClose={() => {
          setDetailOpen(false);
          setPair(null);
          setSelectedPath(null);
        }}
        onSelectFile={(file) => {
          void openFile(file);
        }}
      />
      <AuthorActivityModal
        authorName={activityAuthor}
        branch={branch}
        creatorId={creatorId}
        organizationUrl={organizationUrl}
        project={project}
        repositoryId={repositoryId}
        repositoryName={repositoryName}
        onClose={() => setActivityAuthor(null)}
      />
    </div>
  );
}

function appendCommits(
  current: readonly GitCommitSummary[],
  next: readonly GitCommitSummary[],
): GitCommitSummary[] {
  const byId = new Map<string, GitCommitSummary>();
  for (const commit of current) {
    byId.set(commit.commitId, commit);
  }
  for (const commit of next) {
    byId.set(commit.commitId, commit);
  }
  return [...byId.values()].sort((left, right) =>
    (right.authoredAt ?? "").localeCompare(left.authoredAt ?? ""),
  );
}

function uniqueAuthorOptions(authors: readonly TeamMember[]): { value: string; label: string }[] {
  const names = new Set<string>();
  for (const author of authors) {
    const name = author.displayName.trim();
    if (name.length > 0) {
      names.add(name);
    }
  }
  return [...names]
    .sort((left, right) => left.localeCompare(right, undefined, { sensitivity: "base" }))
    .map((name) => ({ value: name, label: name }));
}
