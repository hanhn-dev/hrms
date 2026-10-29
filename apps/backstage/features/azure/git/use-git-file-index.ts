"use client";

import { useEffect, useState } from "react";
import type { GitBranchSummary } from "@hrms/azure-devops";
import { resolveCatalogBranch } from "@/features/azure/git/catalog-branch";
import { errorMessage, rethrowRedirect } from "@/features/azure/git/git-text";
import { loadGitFileIndex } from "@/features/azure/git/queries";

const pathsByCommit = new Map<string, readonly string[]>();
const pendingByCommit = new Map<string, Promise<readonly string[]>>();

function cacheKey(repositoryId: string, commitId: string): string {
  return `${repositoryId}\n${commitId}`;
}

export function loadCachedGitFilePaths(input: {
  repositoryId: string;
  branch: string;
  commitId: string;
}): Promise<readonly string[]> {
  const key = cacheKey(input.repositoryId, input.commitId);
  const cached = pathsByCommit.get(key);
  if (cached) {
    return Promise.resolve(cached);
  }
  const pending = pendingByCommit.get(key);
  if (pending) {
    return pending;
  }
  const request = loadGitFileIndex(input).then(
    (paths) => {
      pathsByCommit.set(key, paths);
      pendingByCommit.delete(key);
      return paths;
    },
    (error: unknown) => {
      pendingByCommit.delete(key);
      throw error;
    },
  );
  pendingByCommit.set(key, request);
  return request;
}

export function useGitFileIndex(
  repositoryId: string,
  branches: readonly GitBranchSummary[],
  fallbackBranch: string,
): {
  paths: readonly string[];
  branchName: string;
  loading: boolean;
  ready: boolean;
  error: string | null;
} {
  const catalog = resolveCatalogBranch(branches, fallbackBranch);
  const catalogName = catalog?.name ?? "";
  const catalogCommitId = catalog?.commitId ?? "";
  const [paths, setPaths] = useState<readonly string[]>([]);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (catalogName.length === 0 || catalogCommitId.length === 0) {
      setPaths([]);
      setReady(false);
      setLoading(false);
      setError(null);
      return;
    }
    const key = cacheKey(repositoryId, catalogCommitId);
    const hit = pathsByCommit.get(key);
    if (hit) {
      setPaths(hit);
      setReady(true);
      setLoading(false);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    loadCachedGitFilePaths({ repositoryId, branch: catalogName, commitId: catalogCommitId })
      .then((next) => {
        if (!cancelled) {
          setPaths(next);
          setReady(true);
        }
      })
      .catch((loadError: unknown) => {
        rethrowRedirect(loadError);
        if (!cancelled) {
          setPaths([]);
          setReady(false);
          setError(errorMessage(loadError));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [repositoryId, catalogName, catalogCommitId]);

  return {
    paths,
    branchName: catalogName.length > 0 ? catalogName : fallbackBranch || "Dev",
    loading,
    ready,
    error,
  };
}
