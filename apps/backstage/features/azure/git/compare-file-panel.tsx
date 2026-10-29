"use client";

import { Alert, Button, Input, Table } from "antd";
import { useEffect, useState } from "react";
import type { GitBranchSummary, GitCommitSummary, GitFilePair } from "@hrms/azure-devops";
import { FileDiff } from "@/features/azure/git/file-diff";
import { buildGitBlameUrl, buildGitCommitUrl } from "@/features/azure/git/git-links";
import {
  displayGitPath,
  errorMessage,
  firstCommitLine,
  rethrowRedirect,
  shortCommit,
} from "@/features/azure/git/git-text";
import { loadGitCommits, loadGitFilePair } from "@/features/azure/git/queries";
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
  const [error, setError] = useState<string | null>(null);
  const [comparedPath, setComparedPath] = useState<string | null>(null);

  useEffect(() => {
    if (branches.length === 0) {
      return;
    }
    const preferred =
      defaultBranch && branches.some((item) => item.name === defaultBranch)
        ? defaultBranch
        : (branches[0]?.name ?? "");
    const other = branches.find((item) => item.name !== preferred)?.name ?? preferred;
    setLeftBranch((current) => (current && branches.some((item) => item.name === current) ? current : preferred));
    setRightBranch((current) => (current && branches.some((item) => item.name === current) ? current : other));
  }, [branches, defaultBranch]);

  async function compare(): Promise<void> {
    const left = branches.find((item) => item.name === leftBranch);
    const right = branches.find((item) => item.name === rightBranch);
    const filePath = displayGitPath(path);
    if (!left || !right || filePath.length === 0) {
      return;
    }
    setLoading(true);
    setError(null);
    setPair(null);
    setCommits([]);
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
      setCommits(
        [...byId.values()].sort((leftCommit, rightCommit) =>
          (rightCommit.authoredAt ?? "").localeCompare(leftCommit.authoredAt ?? ""),
        ),
      );
    } catch (loadError) {
      rethrowRedirect(loadError);
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
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
          <Input
            placeholder="/src/file.ts"
            value={path}
            onChange={(event) => setPath(event.target.value)}
            onPressEnter={() => {
              void compare();
            }}
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
      {comparedPath && leftBranch && rightBranch ? (
        <div className="flex flex-wrap gap-3 text-sm">
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
        </div>
      ) : null}
    </div>
  );
}
