"use client";

import { Alert, App } from "antd";
import { useState } from "react";
import type { PullRequestCandidate, PullRequestSearchCriteria } from "@hrms/azure-devops";
import { PULL_REQUEST_SEARCH_LIMIT } from "@hrms/azure-devops/criteria";
import { PullRequestsForm } from "@/features/azure/pull-requests/pull-requests-form";
import { PullRequestsTable } from "@/features/azure/pull-requests/pull-requests-table";
import {
  getDonePullRequestIds,
  markPullRequestDone,
  searchPullRequests,
  type PullRequestSearchOptions,
  type PullRequestSearchResult,
} from "@/features/azure/pull-requests/queries";

export function PullRequestsPanel({
  options,
}: {
  options: PullRequestSearchOptions;
}): React.JSX.Element {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PullRequestSearchResult | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([]);
  const [doneIds, setDoneIds] = useState<ReadonlySet<number>>(new Set());
  const { message } = App.useApp();

  async function runLookup(criteria: PullRequestSearchCriteria): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const response = await searchPullRequests(criteria);
      setResult(response);
      setSelectedRowKeys([]);
      const pullRequestIds = (response.results ?? []).map((candidate) => candidate.pullRequestId);
      setDoneIds(new Set(await getDonePullRequestIds(pullRequestIds)));
    } catch (lookupError) {
      setResult(null);
      setError(
        lookupError instanceof Error ? lookupError.message : String(lookupError),
      );
    } finally {
      setLoading(false);
    }
  }

  async function toggleDone(pullRequestId: number, done: boolean): Promise<void> {
    setDoneIds((previous) => {
      const next = new Set(previous);
      if (done) {
        next.add(pullRequestId);
      } else {
        next.delete(pullRequestId);
      }
      return next;
    });
    try {
      await markPullRequestDone(pullRequestId, done);
    } catch (toggleError) {
      // Revert the optimistic update if the write failed.
      setDoneIds((previous) => {
        const next = new Set(previous);
        if (done) {
          next.delete(pullRequestId);
        } else {
          next.add(pullRequestId);
        }
        return next;
      });
      message.error(
        toggleError instanceof Error ? toggleError.message : "Could not save that change.",
      );
    }
  }

  async function markManyDone(pullRequestIds: readonly number[]): Promise<void> {
    const idsToMark = pullRequestIds.filter((id) => !doneIds.has(id));
    if (idsToMark.length === 0) {
      message.info("Selected pull requests are already marked done.");
      return;
    }
    setDoneIds((previous) => {
      const next = new Set(previous);
      for (const id of idsToMark) {
        next.add(id);
      }
      return next;
    });
    const outcomes = await Promise.allSettled(
      idsToMark.map((id) => markPullRequestDone(id, true)),
    );
    const failedIds = idsToMark.filter((_, index) => outcomes[index]?.status === "rejected");
    if (failedIds.length > 0) {
      setDoneIds((previous) => {
        const next = new Set(previous);
        for (const id of failedIds) {
          next.delete(id);
        }
        return next;
      });
      message.error(
        `Could not mark pull request${failedIds.length === 1 ? "" : "s"} ${failedIds.join(", ")} done.`,
      );
    } else {
      message.success(
        `Marked ${idsToMark.length} pull request${idsToMark.length === 1 ? "" : "s"} done.`,
      );
    }
  }

  const results: readonly PullRequestCandidate[] = result?.results ?? [];

  return (
    <div>
      <PullRequestsForm
        loading={loading}
        options={options}
        onClear={() => {
          setResult(null);
          setError(null);
          setSelectedRowKeys([]);
        }}
        onSubmit={(criteria) => void runLookup(criteria)}
      />

      {error ? (
        <Alert className="mb-4" description={error} showIcon title="Lookup failed" type="error" />
      ) : null}

      {result && result.issues.length > 0 ? (
        <Alert
          className="mb-4"
          description={
            <ul className="list-disc pl-5">
              {result.issues.map((issue) => (
                <li key={`${issue.workItemId ?? "invalid"}-${issue.input}`}>{issue.message}</li>
              ))}
            </ul>
          }
          showIcon
          title="Some work items could not be resolved"
          type="warning"
        />
      ) : null}

      {result?.truncated ? (
        <Alert
          className="mb-4"
          description="Narrow the date, authors, or work-item filters to see everything that matches."
          showIcon
          title={`This search hit the ${PULL_REQUEST_SEARCH_LIMIT} item limit`}
          type="warning"
        />
      ) : null}

      {result ? (
        <PullRequestsTable
          doneIds={doneIds}
          onBulkMarkDone={(pullRequestIds) => void markManyDone(pullRequestIds)}
          onSelectionChange={setSelectedRowKeys}
          onToggleDone={(pullRequestId, done) => void toggleDone(pullRequestId, done)}
          results={results}
          selectedRowKeys={selectedRowKeys}
        />
      ) : null}
    </div>
  );
}
