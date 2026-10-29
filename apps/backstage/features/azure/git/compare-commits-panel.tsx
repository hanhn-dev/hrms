"use client";

import { Alert, Button, Input } from "antd";
import { useState } from "react";
import type { GitChangedFile, GitCommitCompare, GitFilePair } from "@hrms/azure-devops";
import { ChangedFiles } from "@/features/azure/git/changed-files";
import { FileDiff } from "@/features/azure/git/file-diff";
import { errorMessage, rethrowRedirect, shortCommit } from "@/features/azure/git/git-text";
import { loadGitCommitCompare, loadGitFilePair } from "@/features/azure/git/queries";
import { Text } from "@/shared/ui";

export function CompareCommitsPanel({
  repositoryId,
}: {
  repositoryId: string;
}): React.JSX.Element {
  const [baseCommitId, setBaseCommitId] = useState("");
  const [targetCommitId, setTargetCommitId] = useState("");
  const [compared, setCompared] = useState<GitCommitCompare | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [pair, setPair] = useState<GitFilePair | null>(null);
  const [pairLoading, setPairLoading] = useState(false);
  const [pairError, setPairError] = useState<string | null>(null);

  async function compare(skip: number): Promise<void> {
    setLoading(true);
    setError(null);
    if (skip === 0) {
      setPair(null);
      setSelectedPath(null);
      setCompared(null);
    }
    try {
      const page = await loadGitCommitCompare({
        repositoryId,
        baseCommitId,
        targetCommitId,
        skip,
      });
      setCompared((current) =>
        skip === 0 || current === null
          ? page
          : { ...page, files: [...current.files, ...page.files] },
      );
    } catch (loadError) {
      rethrowRedirect(loadError);
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }

  async function openFile(file: GitChangedFile): Promise<void> {
    if (!compared) {
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
          base: { commitId: basePath === null ? null : compared.baseCommitId, path: basePath },
          target: { commitId: targetPath === null ? null : compared.targetCommitId, path: targetPath },
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

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-2">
        <label className="block min-w-64 flex-1">
          <span className="mb-1 block text-sm text-slate-600 dark:text-slate-300">Base commit</span>
          <Input
            placeholder="Commit id"
            value={baseCommitId}
            onChange={(event) => setBaseCommitId(event.target.value)}
          />
        </label>
        <label className="block min-w-64 flex-1">
          <span className="mb-1 block text-sm text-slate-600 dark:text-slate-300">Target commit</span>
          <Input
            placeholder="Commit id"
            value={targetCommitId}
            onChange={(event) => setTargetCommitId(event.target.value)}
          />
        </label>
        <Button
          disabled={baseCommitId.trim().length === 0 || targetCommitId.trim().length === 0}
          loading={loading}
          type="primary"
          onClick={() => {
            void compare(0);
          }}
        >
          Compare
        </Button>
      </div>
      {error ? <Alert title={error} type="error" /> : null}
      {compared ? (
        <div className="flex flex-col gap-2">
          <Text>
            {compared.files.length} files
            {compared.aheadCount !== null && compared.behindCount !== null
              ? ` · ${compared.aheadCount} ahead · ${compared.behindCount} behind`
              : ""}
          </Text>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[22rem_1fr]">
            <div className="flex min-h-0 flex-col gap-2">
              <ChangedFiles
                files={compared.files}
                selectedPath={selectedPath}
                truncated={!compared.allChangesIncluded}
                onSelect={(file) => {
                  void openFile(file);
                }}
              />
              {compared.allChangesIncluded ? null : (
                <Button
                  loading={loading}
                  onClick={() => {
                    void compare(compared.skip + compared.top);
                  }}
                >
                  Show more
                </Button>
              )}
            </div>
            <div className="flex min-h-64 flex-col">
              {pairError ? <Alert title={pairError} type="error" /> : null}
              {pairLoading ? <Text type="secondary">Loading diff…</Text> : null}
              {pair ? (
                <FileDiff
                  leftLabel={shortCommit(compared.baseCommitId)}
                  pair={pair}
                  rightLabel={shortCommit(compared.targetCommitId)}
                />
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
