"use client";

import { Alert, Button, Table } from "antd";
import { useEffect, useRef, useState } from "react";
import type { GitBranchSummary, GitCommitSummary, GitFilePair } from "@hrms/azure-devops";
import { mergeCommitPages } from "@/features/azure/git/activity-page";
import {
  isDatabaseRepository,
  preferredDatabaseEnvironment,
  preferredFileBranches,
} from "@/features/azure/git/file-branch-defaults";
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
import { loadDatabaseModuleScript, loadGitCommits, loadGitFilePair } from "@/features/azure/git/queries";
import { rememberRecentGitPath, type RecentGitPath } from "@/features/azure/git/recent-git-paths";
import {
  databaseScriptPair,
  databaseScriptStatus,
  readScriptObject,
  type DatabaseModuleScript,
} from "@/features/azure/git/script-object";
import { formatDate } from "@/shared/format-date";
import { SearchSelect, Text } from "@/shared/ui";

type DatabaseTarget = {
  schema: string;
  name: string;
  branch: string;
  script: string | null;
  truncated: boolean;
};

type DatabaseResult = {
  environment: string;
  script: DatabaseModuleScript;
};

export function CompareFilePanel({
  repositoryId,
  repositoryName,
  organizationUrl,
  project,
  defaultBranch,
  branches,
  branchesLoading,
  databaseEnvironments,
}: {
  repositoryId: string;
  repositoryName: string;
  organizationUrl: string;
  project: string;
  defaultBranch: string | null;
  branches: readonly GitBranchSummary[];
  branchesLoading: boolean;
  databaseEnvironments: readonly string[];
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
  const [databaseEnvironment, setDatabaseEnvironment] = useState(() =>
    preferredDatabaseEnvironment(databaseEnvironments),
  );
  const [databaseTarget, setDatabaseTarget] = useState<DatabaseTarget | null>(null);
  const [databaseResult, setDatabaseResult] = useState<DatabaseResult | null>(null);
  const [databaseNote, setDatabaseNote] = useState<string | null>(null);
  const [databaseLoading, setDatabaseLoading] = useState(false);
  const [databaseError, setDatabaseError] = useState<string | null>(null);
  const branchChoice = useRef({ left: leftBranch, right: rightBranch });
  const showDatabase = isDatabaseRepository(repositoryName);
  if (branches.length > 0 && (branches !== appliedBranches || defaultBranch !== appliedDefaultBranch)) {
    setAppliedBranches(branches);
    setAppliedDefaultBranch(defaultBranch);
    const choice = preferredFileBranches(repositoryName, branches, defaultBranch);
    setLeftBranch((current) => (current && branches.some((item) => item.name === current) ? current : choice.left));
    setRightBranch((current) => (current && branches.some((item) => item.name === current) ? current : choice.right));
  }

  useEffect(() => {
    branchChoice.current = { left: leftBranch, right: rightBranch };
  });

  useEffect(() => {
    if (!databaseTarget || databaseEnvironment.length === 0) {
      return;
    }
    let cancelled = false;
    setDatabaseLoading(true);
    setDatabaseError(null);
    loadDatabaseModuleScript({
      environment: databaseEnvironment,
      schema: databaseTarget.schema,
      name: databaseTarget.name,
    })
      .then((script) => {
        if (!cancelled) {
          setDatabaseResult({ environment: databaseEnvironment, script });
        }
      })
      .catch((loadError: unknown) => {
        rethrowRedirect(loadError);
        if (!cancelled) {
          setDatabaseResult(null);
          setDatabaseError(errorMessage(loadError));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setDatabaseLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [databaseTarget, databaseEnvironment]);

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
    setDatabaseTarget(null);
    setDatabaseResult(null);
    setDatabaseNote(null);
    setDatabaseError(null);
    setDatabaseLoading(false);
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
      if (showDatabase) {
        if (databaseEnvironments.length === 0) {
          setDatabaseNote("No database environment is configured.");
        } else if (filePair.target.missing || filePair.target.content === null) {
          const object = filePair.target.missing ? null : readScriptObject("", filePath);
          setDatabaseNote(
            filePair.target.missing
              ? `This file is not on ${right.name}, so there is no script to compare with the database.`
              : (filePair.target.omission ?? "The branch script could not be read."),
          );
          if (object) {
            setDatabaseLoading(true);
            setDatabaseTarget({
              schema: object.schema,
              name: object.name,
              branch: right.name,
              script: null,
              truncated: false,
            });
          }
        } else {
          const object = readScriptObject(filePair.target.content, filePath);
          if (!object) {
            setDatabaseNote(
              "This file is not a procedure, view, or function, so there is no database script to compare.",
            );
          } else {
            setDatabaseLoading(true);
            setDatabaseTarget({
              schema: object.schema,
              name: object.name,
              branch: right.name,
              script: filePair.target.content,
              truncated: filePair.target.truncated,
            });
          }
        }
      }
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
  const liveDefinition =
    !databaseLoading && databaseResult?.environment === databaseEnvironment
      ? databaseResult.script.definition
      : null;
  const databaseStatus =
    databaseTarget?.script && liveDefinition
      ? databaseScriptStatus(databaseTarget.branch, databaseEnvironment, databaseTarget.script, liveDefinition)
      : null;
  const databaseUnavailable =
    !databaseLoading && databaseResult?.environment === databaseEnvironment && !liveDefinition
      ? (databaseResult.script.unavailableReason ??
        `Unable to read ${databaseTarget?.schema ?? "dbo"}.${databaseTarget?.name ?? "object"}.`)
      : null;

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
        {showDatabase && databaseEnvironments.length > 0 ? (
          <label className="block min-w-40">
            <span className="mb-1 block text-sm text-slate-600 dark:text-slate-300">Database</span>
            <SearchSelect
              aria-label="Database"
              className="w-full"
              options={databaseEnvironments.map((name) => ({ value: name, label: name }))}
              value={databaseEnvironment || undefined}
              onChange={(value) => {
                setDatabaseEnvironment(String(value));
                if (databaseTarget) {
                  setDatabaseLoading(true);
                  setDatabaseError(null);
                }
              }}
            />
          </label>
        ) : null}
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
      {pair && showDatabase && (databaseNote || databaseTarget || databaseError) ? (
        <div className="flex flex-col gap-2">
          <Text>Database script</Text>
          {databaseNote ? <Alert title={databaseNote} type="info" /> : null}
          {databaseError ? <Alert title={databaseError} type="error" /> : null}
          {databaseTarget ? (
            <>
              <Text>
                {databaseTarget.schema}.{databaseTarget.name}
              </Text>
              {databaseLoading ? <Alert title={`Reading the ${databaseEnvironment} database.`} type="info" /> : null}
              {databaseStatus && liveDefinition && databaseTarget.script ? (
                <>
                  <Alert title={databaseStatus.message} type={databaseStatus.match ? "success" : "warning"} />
                  <FileDiff
                    leftLabel={`${databaseTarget.branch} script`}
                    pair={databaseScriptPair(databaseTarget.script, liveDefinition, databaseTarget.truncated)}
                    rightLabel={`${databaseEnvironment} database`}
                  />
                </>
              ) : null}
              {!databaseLoading && liveDefinition && databaseTarget.script === null ? (
                <pre className="m-0 max-h-[32rem] overflow-auto rounded border border-slate-200 px-2 py-1 font-mono text-xs whitespace-pre-wrap break-all dark:border-slate-700">
                  {liveDefinition}
                </pre>
              ) : null}
              {databaseUnavailable ? <Alert title={databaseUnavailable} type="warning" /> : null}
            </>
          ) : null}
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
