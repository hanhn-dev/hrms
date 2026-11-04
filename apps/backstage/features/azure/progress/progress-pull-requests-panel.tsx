"use client";

import { useState } from "react";
import Link from "next/link";
import { Alert, Drawer, Table, Tag } from "antd";
import type { PullRequestCandidate } from "@hrms/azure-devops";
import {
  filterPullRequestMembers,
  type MemberPullRequestProgress,
} from "@/features/azure/progress/aggregate-pull-requests";
import { useProgressMemberFilter } from "@/features/azure/progress/progress-pr-filter-context";
import type { TeamMemberPullRequestsData } from "@/features/azure/progress/queries";
import { formatDate } from "@/shared/format-date";
import { Text } from "@/shared/ui";

const STATUS_COLORS: Record<string, string> = {
  active: "blue",
  completed: "green",
  abandoned: "red",
};

function statusLabel(status: string): string {
  if (status.length === 0) {
    return status;
  }
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function normalizeBranchName(branch: string): string {
  return branch.replace(/^refs\/heads\//, "");
}

function PullRequestList({
  pullRequests,
}: {
  pullRequests: readonly PullRequestCandidate[];
}): React.JSX.Element {
  if (pullRequests.length === 0) {
    return <p className="m-0 text-sm text-slate-500">No PRs opened in this period.</p>;
  }

  return (
    <ul className="m-0 flex list-none flex-col gap-3 p-0">
      {pullRequests.map((pr) => (
        <li className="border-b border-slate-100 pb-3 last:border-0 last:pb-0" key={pr.pullRequestId}>
          <div className="flex flex-wrap items-start gap-2">
            <a
              className="font-medium text-slate-900 underline-offset-2 hover:underline"
              href={pr.url}
              rel="noreferrer"
              target="_blank"
            >
              {pr.title}
            </a>
            <Tag color={STATUS_COLORS[pr.status] ?? "default"}>{statusLabel(pr.status)}</Tag>
          </div>
          <Text className="mt-1 block text-sm" type="secondary">
            {pr.repositoryName ?? "Repository"} · opened {formatDate(pr.openedDate)} · →{" "}
            {normalizeBranchName(pr.targetBranch)}
          </Text>
        </li>
      ))}
    </ul>
  );
}

/** Server-loaded PR counts and list for the Team progress Collapse panel. */
export function ProgressPullRequestsPanel({
  data,
}: {
  data: TeamMemberPullRequestsData;
}): React.JSX.Element {
  const memberFilter = useProgressMemberFilter();
  const [selected, setSelected] = useState<MemberPullRequestProgress | null>(null);
  const rows = filterPullRequestMembers(data.rows, memberFilter);
  const summary = {
    totalOpened: rows.reduce((sum, row) => sum + row.opened, 0),
    byStatus: {
      active: rows.reduce((sum, row) => sum + row.byStatus.active, 0),
      completed: rows.reduce((sum, row) => sum + row.byStatus.completed, 0),
      abandoned: rows.reduce((sum, row) => sum + row.byStatus.abandoned, 0),
    },
  };

  return (
    <div className="flex flex-col gap-3">
      {data.missingDates ? (
        <Alert
          showIcon
          title="No date range for this period."
          description="Pick a sprint that has start and finish dates, or switch to Custom and choose a range."
          type="info"
        />
      ) : null}
      {data.unresolvedMembers.length > 0 ? (
        <Alert
          showIcon
          title="Some members could not be matched to Azure DevOps identities."
          description={`${data.unresolvedMembers.join(", ")}. Their PR counts may be incomplete.`}
          type="warning"
        />
      ) : null}
      {data.truncated ? (
        <Alert
          showIcon
          title="Pull request search hit the Azure DevOps page cap."
          description="Counts may be incomplete for this period."
          type="warning"
        />
      ) : null}

      {!data.missingDates ? (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-medium text-slate-700">
            {summary.totalOpened} opened
            {data.dateFrom != null || data.dateTo != null
              ? ` · ${formatDate(data.dateFrom)} – ${formatDate(data.dateTo)}`
              : null}
          </span>
          <Tag color="blue">Active {summary.byStatus.active}</Tag>
          <Tag color="green">Completed {summary.byStatus.completed}</Tag>
          <Tag color="red">Abandoned {summary.byStatus.abandoned}</Tag>
        </div>
      ) : null}

      {rows.length === 0 ? (
        <p className="m-0 text-sm text-slate-500">No members to show.</p>
      ) : (
        <Table
          columns={[
            {
              title: "Member",
              dataIndex: "displayName",
              key: "displayName",
            },
            {
              title: "Opened",
              dataIndex: "opened",
              key: "opened",
              width: 90,
              align: "right",
              sorter: (left: MemberPullRequestProgress, right: MemberPullRequestProgress) =>
                left.opened - right.opened,
              defaultSortOrder: "descend",
              render: (value: number, row: MemberPullRequestProgress) => (
                <button
                  className="cursor-pointer border-0 bg-transparent p-0 text-inherit underline-offset-2 hover:underline"
                  type="button"
                  onClick={() => {
                    setSelected(row);
                  }}
                >
                  {value}
                </button>
              ),
            },
            {
              title: "Active",
              key: "active",
              width: 80,
              align: "right",
              render: (_value, row: MemberPullRequestProgress) => row.byStatus.active,
            },
            {
              title: "Completed",
              key: "completed",
              width: 100,
              align: "right",
              render: (_value, row: MemberPullRequestProgress) => row.byStatus.completed,
            },
            {
              title: "Abandoned",
              key: "abandoned",
              width: 100,
              align: "right",
              render: (_value, row: MemberPullRequestProgress) => row.byStatus.abandoned,
            },
          ]}
          dataSource={rows.map((row) => ({ ...row, key: row.displayName }))}
          pagination={false}
          size="small"
          onRow={(row) => ({
            className: "cursor-pointer",
            onClick: () => {
              setSelected(row);
            },
          })}
        />
      )}

      <Link className="text-sm underline" href="/azure/pull-requests">
        Open in Pull requests
      </Link>

      <Drawer
        destroyOnHidden
        open={selected != null}
        placement="right"
        size="large"
        title={selected ? `${selected.displayName} — pull requests` : "Pull requests"}
        onClose={() => {
          setSelected(null);
        }}
      >
        {selected ? <PullRequestList pullRequests={selected.pullRequests} /> : null}
      </Drawer>
    </div>
  );
}
