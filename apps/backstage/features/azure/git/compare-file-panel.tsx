"use client";

import { Alert, Button, Table } from "antd";
import { useEffect, useRef, useState } from "react";
import type { GitBranchSummary, GitCommitSummary, GitFilePair } from "@hrms/azure-devops";
import { mergeCommitPages } from "@/features/azure/git/activity-page";
import { FileDiff } from "@/features/azure/git/file-diff";
import { GitPathSearch } from "@/features/azure/git/git-path-search";
import { buildGitBlameUrl, buildGitCommitUrl } from "@/features/azure/git/git-links";
import {
  displayGitPath,
  errorMessage,
  firstCommitLine,
  rethrowRedirect,
  shortCommit,
} from "@/features/azure/git/git-text";
import { loadGitCommits, loadGitFilePair } from "@/features/azure/git/queries";
import { rememberRecentGitPath, type RecentGitPath } from "@/features/azure/git/recent-git-paths";
import { formatDate } from "@/shared/format-date";
import { SearchSelect, Text } from "@/shared/ui";

export function CompareFilePanel({
  repositoryId,
  repositoryName,
  organizationUrl,
  project,
  defaultBranch,
  branches,
  branchesLoading,
}: {
  repositoryId: string;
  repositoryName: string;
  organizationUrl: string;
  project: string;
  defaultBranch: string | null;
  branches: readonly GitBranchSummary[];
  branchesLoading: boolean;
}): React.JSX.Element {
  const [leftBranch, setLeftBranch] = useState("");
  const [rightBranch, setRightBranch] = useState("");
  const [path, setPath] = useState("");
  const [pair, setPair] = useState<GitFilePair | null>(null);
  const [commits, setCommits] = useState<GitCommitSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [comparedPath, setComparedPath] = useState<string | null>(null);
  const [historyPage, setHistoryPage] = useState<{
    leftBranch: string;
    rightBranch: string;
    path: string;
    leftSkip: number;
    rightSkip: number;
    leftHasMore: boolean;
    rightHasMore: boolean;
  } | null>(null);
  const [appliedBranches, setAppliedBranches] = useState<readonly GitBranchSummary[] | null>(null);
  const [appliedDefaultBranch, setAppliedDefaultBranch] = useState<string | null | undefined>(undefined);
  const branchChoice = useRef({ left: leftBranch, right: rightBranch });
  if (branches.length > 0 && (branches !== appliedBranches || defaultBranch !== appliedDefaultBranch)) {
    setAppliedBranches(branches);
    setAppliedDefaultBranch(defaultBranch);
    const preferred =
      defaultBranch && branches.some((item) => item.name === defaultBranch)
        ? defaultBranch
        : (branches[0]?.name ?? "");
    const other = branches.find((item) => item.name !== preferred)?.name ?? preferred;
    setLeftBranch((current) => (current && branches.some((item) => item.name === current) ? current : preferred));
    setRightBranch((current) => (current && branches.some((item) => item.name === current) ? current : other));
  }

  useEffect(() => {
    branchChoice.current = { left: leftBranch, right: rightBranch };
  });

  function selectRecent(recent: RecentGitPath): void {
    setPath(recent.path);
    const next = { ...branchChoice.current };
    if (recent.leftBranch && branches.some((item) => item.name === recent.leftBranch)) {
      next.left = recent.leftBranch;
      setLeftBranch(recent.leftBranch);
    }
    if (recent.rightBranch && branches.some((item) => item.name === recent.rightBranch)) {
      next.right = recent.rightBranch;
      setRightBranch(recent.rightBranch);
    }
    branchChoice.current = next;
  }

  async function compare(nextPath: string = path): Promise<void> {
    const left = branches.find((item) => item.name === branchChoice.current.left);
    const right = branches.find((item) => item.name === branchChoice.current.right);
    const filePath = displayGitPath(nextPath);
    if (!left || !right || filePath.length === 0) {
      return;
    }
    setLoading(true);
    setError(null);
    setPair(null);
    setCommits([]);
    setHistoryPage(null);
    try {
      const [filePair, onRight, onLeft] = await Promise.all([
        loadGitFilePair({
          repositoryId,
          base: { commitId: left.commitId, path: filePath },
          target: { commitId: right.commitId, path: filePath },
        }),
        loadGitCommits({
          repositoryId,
          branch: right.name,
          compareBranch: left.name,
          path: filePath,
        }),
        loadGitCommits({
          repositoryId,
          branch: left.name,
          compareBranch: right.name,
          path: filePath,
        }),
      ]);
      const byId = new Map<string, GitCommitSummary>();
      for (const commit of [...onRight.commits, ...onLeft.commits]) {
        byId.set(commit.commitId, commit);
      }
      setPair(filePair);
      setComparedPath(filePath);
      setPath(filePath);
      rememberRecentGitPath(repositoryId, {
        path: filePath,
        leftBranch: left.name,
        rightBranch: right.name,
      });
      setCommits(
        mergeCommitPages([], [...byId.values()]),
      );
      setHistoryPage({
        leftBranch: left.name,
        rightBranch: right.name,
        path: filePath,
        leftSkip: onLeft.skip + onLeft.top,
        rightSkip: onRight.skip + onRight.top,
        leftHasMore: onLeft.hasMore,
        rightHasMore: onRight.hasMore,
      });
    } catch (loadError) {
      rethrowRedirect(loadError);
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }

  async function loadMoreHistory(): Promise<void> {
    if (!historyPage || loadingMore || (!historyPage.leftHasMore && !historyPage.rightHasMore)) {
      return;
    }
    setLoadingMore(true);
    setError(null);
    try {
      const [onRight, onLeft] = await Promise.all([
        historyPage.rightHasMore
          ? loadGitCommits({
              repositoryId,
              branch: historyPage.rightBranch,
              compareBranch: historyPage.leftBranch,
              path: historyPage.path,
              skip: historyPage.rightSkip,
            })
          : null,
        historyPage.leftHasMore
          ? loadGitCommits({
              repositoryId,
              branch: historyPage.leftBranch,
              compareBranch: historyPage.rightBranch,
              path: historyPage.path,
              skip: historyPage.leftSkip,
            })
          : null,
      ]);
      setCommits((current) =>
        mergeCommitPages(current, [...(onRight?.commits ?? []), ...(onLeft?.commits ?? [])]),
      );
      setHistoryPage((current) =>
        current === null
          ? null
          : {
              ...current,
              rightSkip: onRight ? onRight.skip + onRight.top : current.rightSkip,
              leftSkip: onLeft ? onLeft.skip + onLeft.top : current.leftSkip,
              rightHasMore: onRight?.hasMore ?? false,
              leftHasMore: onLeft?.hasMore ?? false,
            },
      );
    } catch (loadError) {
      rethrowRedirect(loadError);
      setError(errorMessage(loadError));
    } finally {
      setLoadingMore(false);
    }
  }

  const ready = leftBranch.length > 0 && rightBranch.length > 0 && path.trim().length > 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-2">
        <label className="block min-w-48">
          <span className="mb-1 block text-sm text-slate-600 dark:text-slate-300">Left branch</span>
          <SearchSelect
            aria-label="Left branch"
            className="w-full"
            loading={branchesLoading}
            options={branches.map((item) => ({ value: item.name, label: item.name }))}
            value={leftBranch || undefined}
            onChange={(value) => setLeftBranch(String(value))}
          />
        </label>
        <label className="block min-w-48">
          <span className="mb-1 block text-sm text-slate-600 dark:text-slate-300">Right branch</span>
          <SearchSelect
            aria-label="Right branch"
            className="w-full"
            loading={branchesLoading}
            options={branches.map((item) => ({ value: item.name, label: item.name }))}
            value={rightBranch || undefined}
            onChange={(value) => setRightBranch(String(value))}
          />
        </label>
        <label className="block min-w-64 flex-1">
          <span className="mb-1 block text-sm text-slate-600 dark:text-slate-300">Path</span>
          <GitPathSearch
            branches={branches}
            branchesLoading={branchesLoading}
            fallbackBranch={leftBranch}
            repositoryId={repositoryId}
            value={path}
            onChange={setPath}
            onPressEnter={(nextPath) => {
              void compare(nextPath);
            }}
            onSelectRecent={selectRecent}
          />
        </label>
        <Button
          disabled={!ready}
          loading={loading}
          type="primary"
          onClick={() => {
            void compare();
          }}
        >
          Compare
        </Button>
      </div>
      {error ? <Alert title={error} type="error" /> : null}
      {comparedPath && pair && leftBranch && rightBranch ? (
        <div className="flex flex-wrap gap-3 text-sm">
          {pair.base.missing ? null : (
            <a
              href={buildGitBlameUrl({
                organizationUrl,
                project,
                repositoryName,
                path: comparedPath,
                branch: leftBranch,
              })}
              rel="noreferrer"
              target="_blank"
            >
              Open blame in Azure DevOps ({leftBranch})
            </a>
          )}
          {pair.target.missing ? null : (
            <a
              href={buildGitBlameUrl({
                organizationUrl,
                project,
                repositoryName,
                path: comparedPath,
                branch: rightBranch,
              })}
              rel="noreferrer"
              target="_blank"
            >
              Open blame in Azure DevOps ({rightBranch})
            </a>
          )}
        </div>
      ) : null}
      {pair ? (
        <div className="flex flex-col">
          <FileDiff leftLabel={leftBranch} pair={pair} rightLabel={rightBranch} />
        </div>
      ) : null}
      {pair ? (
        <div>
          <Text>Commits that changed this file on one branch and not the other</Text>
          <Table
            className="mt-2"
            columns={[
              {
                title: "Commit",
                dataIndex: "commitId",
                width: 110,
                render: (commitId: string) => (
                  <a
                    href={buildGitCommitUrl({ organizationUrl, project, repositoryName, commitId })}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {shortCommit(commitId)}
                  </a>
                ),
              },
              { title: "Author", dataIndex: "authorName", width: 180, render: (name: string | null) => name ?? "—" },
              { title: "When", dataIndex: "authoredAt", width: 190, render: (value: string | null) => formatDate(value) },
              { title: "Message", dataIndex: "comment", render: (comment: string | null) => firstCommitLine(comment) },
            ]}
            dataSource={commits}
            locale={{ emptyText: "No commits touched this file between these branches." }}
            pagination={false}
            rowKey="commitId"
            size="small"
          />
          {historyPage?.leftHasMore || historyPage?.rightHasMore ? (
            <Button
              className="mt-3"
              loading={loadingMore}
              onClick={() => {
                void loadMoreHistory();
              }}
            >
              Load more commits
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
