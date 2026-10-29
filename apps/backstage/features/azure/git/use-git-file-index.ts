"use client";

import { useEffect, useState } from "react";
import type { GitBranchSummary } from "@hrms/azure-devops";
import { resolveCatalogBranch } from "@/features/azure/git/catalog-branch";
import { errorMessage, rethrowRedirect } from "@/features/azure/git/git-text";
import { searchGitFilePaths } from "@/features/azure/git/queries";

const pathsByCommit = new Map<string, readonly string[]>();
const pendingBySearch = new Map<string, Promise<readonly string[]>>();

function cacheKey(repositoryId: string, commitId: string): string {
  return `${repositoryId}\n${commitId}`;
}

export function searchCachedGitFilePaths(input: {
  repositoryId: string;
  branch: string;
  commitId: string;
  query: string;
}): Promise<readonly string[]> {
  const key = cacheKey(input.repositoryId, input.commitId);
  const requestKey = `${key}\n${input.query.trim().toLowerCase()}`;
  const pending = pendingBySearch.get(requestKey);
  if (pending) {
    return pending;
  }
  const request = searchGitFilePaths(input).then(
    (paths) => {
      pathsByCommit.set(key, paths);
      pendingBySearch.delete(requestKey);
      return paths;
    },
    (error: unknown) => {
      pendingBySearch.delete(requestKey);
      throw error;
    },
  );
  pendingBySearch.set(requestKey, request);
  return request;
}

export function useGitFileIndex(
  repositoryId: string,
  branches: readonly GitBranchSummary[],
  fallbackBranch: string,
  query: string,
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
  const normalizedQuery = query.trim();
  const indexKey =
    catalogName.length === 0 || catalogCommitId.length === 0 ? "" : cacheKey(repositoryId, catalogCommitId);
  const requestKey = normalizedQuery.length === 0 ? "" : `${indexKey}\n${normalizedQuery.toLowerCase()}`;
  const [loadedRequestKey, setLoadedRequestKey] = useState<string | null>(null);
  if (requestKey !== loadedRequestKey) {
    setLoadedRequestKey(requestKey);
    if (requestKey.length === 0) {
      setPaths([]);
      setReady(true);
      setLoading(false);
      setError(null);
    } else {
      const hit = pathsByCommit.get(indexKey);
      if (hit && hit.length > 0) {
        setPaths(hit);
      }
      setLoading(true);
      setReady(false);
      setError(null);
    }
  }

  useEffect(() => {
    if (catalogName.length === 0 || catalogCommitId.length === 0 || normalizedQuery.length === 0) {
      return;
    }
    let cancelled = false;
    searchCachedGitFilePaths({
      repositoryId,
      branch: catalogName,
      commitId: catalogCommitId,
      query: normalizedQuery,
    })
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
  }, [repositoryId, catalogName, catalogCommitId, normalizedQuery]);

  return {
    paths,
    branchName: catalogName.length > 0 ? catalogName : fallbackBranch || "Dev",
    loading,
    ready,
    error,
  };
}
