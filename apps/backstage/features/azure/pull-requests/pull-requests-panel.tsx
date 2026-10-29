"use client";

import { MenuFoldOutlined, MenuUnfoldOutlined } from "@ant-design/icons";
import { Alert, App, Button, Layout, Tooltip } from "antd";
import { useState } from "react";
import type { PullRequestCandidate, PullRequestSearchCriteria } from "@hrms/azure-devops";
import { PULL_REQUEST_SEARCH_LIMIT } from "@hrms/azure-devops/criteria";
import {
  FILTER_SIDER_COLLAPSED_WIDTH,
  FILTER_SIDER_WIDTH,
} from "@/features/azure/pull-requests/filter-sider";
import { PullRequestsForm } from "@/features/azure/pull-requests/pull-requests-form";
import { PullRequestsTable } from "@/features/azure/pull-requests/pull-requests-table";
import {
  getDonePullRequestIds,
  markPullRequestDone,
  searchPullRequests,
  type PullRequestSearchOptions,
  type PullRequestSearchResult,
} from "@/features/azure/pull-requests/queries";
import { mergePullRequestResults } from "@/features/azure/pull-requests/result-page";

export function PullRequestsPanel({
  options,
}: {
  options: PullRequestSearchOptions;
}): React.JSX.Element {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PullRequestSearchResult | null>(null);
  const [submittedCriteria, setSubmittedCriteria] = useState<PullRequestSearchCriteria | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([]);
  const [doneIds, setDoneIds] = useState<ReadonlySet<number>>(new Set());
  const [collapsed, setCollapsed] = useState(false);
  const { message } = App.useApp();

  async function runLookup(criteria: PullRequestSearchCriteria): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const response = await searchPullRequests(criteria);
      setResult(response);
      setSubmittedCriteria(criteria);
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

  async function loadMore(): Promise<void> {
    if (!submittedCriteria || result?.nextSkip == null || loadingMore) {
      return;
    }
    setLoadingMore(true);
    setError(null);
    try {
      const response = await searchPullRequests(submittedCriteria, result.nextSkip);
      const merged = mergePullRequestResults(result.results, response.results);
      setResult({ ...response, results: merged });
      const pullRequestIds = response.results.map((candidate) => candidate.pullRequestId);
      const nextDone = await getDonePullRequestIds(pullRequestIds);
      setDoneIds((current) => new Set([...current, ...nextDone]));
    } catch (lookupError) {
      setError(lookupError instanceof Error ? lookupError.message : String(lookupError));
    } finally {
      setLoadingMore(false);
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
    <Layout
      className="min-h-0 flex-1 overflow-hidden !bg-transparent max-md:!flex-col"
      hasSider
    >
      <Layout.Sider
        className="!bg-transparent max-md:!max-w-none max-md:!flex-none"
        classNames={{
          body: "flex h-full min-h-0 flex-col overflow-hidden max-md:max-h-[45vh]",
        }}
        collapsed={collapsed}
        collapsedWidth={FILTER_SIDER_COLLAPSED_WIDTH}
        collapsible
        theme="light"
        trigger={null}
        width={FILTER_SIDER_WIDTH}
      >
        <div className="flex shrink-0 items-center justify-between gap-1 pb-2">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Filters</span>
          <Tooltip title="Collapse filters">
            <Button
              aria-label="Collapse filters"
              icon={<MenuFoldOutlined />}
              type="text"
              onClick={() => {
                setCollapsed(true);
              }}
            />
          </Tooltip>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden">
          <PullRequestsForm
            loading={loading}
            options={options}
            onClear={() => {
              setResult(null);
              setError(null);
              setSelectedRowKeys([]);
              setSubmittedCriteria(null);
            }}
            onSubmit={(criteria) => void runLookup(criteria)}
          />
        </div>
      </Layout.Sider>

      <Layout.Content className="flex min-h-0 min-w-0 flex-col overflow-auto md:pl-4">
        {collapsed ? (
          <div className="mb-2 shrink-0">
            <Tooltip title="Expand filters">
              <Button
                aria-label="Expand filters"
                icon={<MenuUnfoldOutlined />}
                type="text"
                onClick={() => {
                  setCollapsed(false);
                }}
              >
                Filters
              </Button>
            </Tooltip>
          </div>
        ) : null}

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
            description="Load the next page, or narrow the date, authors, or work-item filters."
            showIcon
            title={`This search hit the ${PULL_REQUEST_SEARCH_LIMIT} item limit`}
            type="warning"
          />
        ) : null}

        {result ? (
          <>
            <PullRequestsTable
              doneIds={doneIds}
              onBulkMarkDone={(pullRequestIds) => void markManyDone(pullRequestIds)}
              onSelectionChange={setSelectedRowKeys}
              onToggleDone={(pullRequestId, done) => void toggleDone(pullRequestId, done)}
              results={results}
              selectedRowKeys={selectedRowKeys}
            />
            {result.nextSkip != null ? (
              <Button
                className="mt-3"
                loading={loadingMore}
                onClick={() => {
                  void loadMore();
                }}
              >
                Load more pull requests
              </Button>
            ) : null}
          </>
        ) : null}
      </Layout.Content>
    </Layout>
  );
}
