"use client";

import { Alert, Segmented } from "antd";
import { useEffect, useState } from "react";
import type { GitBranchSummary } from "@hrms/azure-devops";
import type { GitTraceCatalog } from "@/features/azure/git/catalog";
import { CompareCommitsPanel } from "@/features/azure/git/compare-commits-panel";
import { CompareFilePanel } from "@/features/azure/git/compare-file-panel";
import { errorMessage, rethrowRedirect } from "@/features/azure/git/git-text";
import { HistoryPanel } from "@/features/azure/git/history-panel";
import { loadGitBranches } from "@/features/azure/git/queries";
import { SearchSelect } from "@/shared/ui";

type GitMode = "history" | "commits" | "file";

const DEFAULT_REPOSITORY_NAME = "TDG HRMS";

function initialRepositoryId(repositories: GitTraceCatalog["repositories"]): string {
  const preferred = repositories.find(
    (item) => item.name.localeCompare(DEFAULT_REPOSITORY_NAME, undefined, { sensitivity: "base" }) === 0,
  );
  return preferred?.id ?? repositories[0]?.id ?? "";
}

export function GitPanel({ catalog }: { catalog: GitTraceCatalog }): React.JSX.Element {
  const [repositoryId, setRepositoryId] = useState(() => initialRepositoryId(catalog.repositories));
  const repository = catalog.repositories.find((item) => item.id === repositoryId) ?? catalog.repositories[0];
  const [branches, setBranches] = useState<GitBranchSummary[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [branchError, setBranchError] = useState<string | null>(null);
  const [mode, setMode] = useState<GitMode>("history");

  useEffect(() => {
    if (!repositoryId) {
      return;
    }
    let cancelled = false;
    setBranchesLoading(true);
    setBranchError(null);
    setBranches([]);
    loadGitBranches(repositoryId)
      .then((rows) => {
        if (!cancelled) {
          setBranches(rows);
        }
      })
      .catch((loadError: unknown) => {
        rethrowRedirect(loadError);
        if (!cancelled) {
          setBranchError(errorMessage(loadError));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setBranchesLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [repositoryId]);

  if (!repository) {
    return <Alert title="This Azure DevOps project has no Git repositories." type="info" />;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-end gap-3">
        <label className="block min-w-56">
          <span className="mb-1 block text-sm text-slate-600 dark:text-slate-300">Repository</span>
          <SearchSelect
            aria-label="Repository"
            className="w-full"
            options={catalog.repositories.map((item) => ({ value: item.id, label: item.name }))}
            value={repository.id}
            onChange={(value) => setRepositoryId(String(value))}
          />
        </label>
        <Segmented
          options={[
            { label: "History", value: "history" },
            { label: "Compare commits", value: "commits" },
            { label: "Compare file", value: "file" },
          ]}
          value={mode}
          onChange={(value) => {
            if (value === "history" || value === "commits" || value === "file") {
              setMode(value);
            }
          }}
        />
      </div>
      {branchError ? <Alert title={branchError} type="error" /> : null}
      <div className={mode === "history" ? "flex min-h-0 flex-1 flex-col overflow-hidden" : "min-h-0 flex-1 overflow-auto"}>
        {mode === "history" ? (
          <HistoryPanel
            key={repository.id}
            authors={catalog.authors}
            branches={branches}
            branchesLoading={branchesLoading}
            defaultBranch={repository.defaultBranch}
            organizationUrl={catalog.organizationUrl}
            project={catalog.project}
            repositoryId={repository.id}
            repositoryName={repository.name}
          />
        ) : null}
        {mode === "commits" ? <CompareCommitsPanel key={repository.id} repositoryId={repository.id} /> : null}
        {mode === "file" ? (
          <CompareFilePanel
            key={repository.id}
            branches={branches}
            branchesLoading={branchesLoading}
            defaultBranch={repository.defaultBranch}
            organizationUrl={catalog.organizationUrl}
            project={catalog.project}
            repositoryId={repository.id}
            repositoryName={repository.name}
          />
        ) : null}
      </div>
    </div>
  );
}
