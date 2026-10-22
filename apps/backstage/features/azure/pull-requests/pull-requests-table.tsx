"use client";

import { CheckOutlined, CopyOutlined, SettingOutlined } from "@ant-design/icons";
import { App, Button, Checkbox, Dropdown, Table, Tag, Tooltip } from "antd";
import type { ColumnsType, TableProps } from "antd/es/table";
import { useMemo, useState } from "react";
import type { PullRequestCandidate } from "@hrms/azure-devops";
import {
  buildCherryPickCommand,
  orderSelectedCandidates,
  type CherryPickSort,
  type CherryPickSortKey,
} from "@/features/azure/pull-requests/build-cherry-pick-command";
import { useWorkItemView } from "@/features/azure/pull-requests/work-item-view";
import { formatDate } from "@/shared/format-date";

const STATUS_COLORS: Record<string, string> = {
  active: "blue",
  completed: "green",
  abandoned: "red",
  not_set: "default",
};

type ColumnKey = "mergedDate" | "title" | "author" | "status" | "targetBranch" | "done";

const COLUMN_LABELS: Record<ColumnKey, string> = {
  mergedDate: "Merged",
  title: "Title",
  author: "Author",
  status: "Status",
  targetBranch: "Target",
  done: "Done",
};

const ALL_COLUMN_KEYS: readonly ColumnKey[] = [
  "mergedDate",
  "title",
  "author",
  "status",
  "targetBranch",
  "done",
];

const DEFAULT_SORT: NonNullable<CherryPickSort> = {
  key: "mergedDate",
  order: "ascend",
};

function normalizeBranchName(branch: string): string {
  return branch.replace(/^refs\/heads\//, "");
}

function buildFilterOptions(values: readonly string[]): { text: string; value: string }[] {
  return Array.from(new Set(values))
    .sort((left, right) => left.localeCompare(right))
    .map((value) => ({ text: value, value }));
}

function isCherryPickSortKey(key: unknown): key is CherryPickSortKey {
  return key === "mergedDate" || key === "title";
}

export function PullRequestsTable({
  results,
  selectedRowKeys,
  onSelectionChange,
  doneIds,
  onToggleDone,
  onBulkMarkDone,
}: {
  results: readonly PullRequestCandidate[];
  selectedRowKeys: number[];
  onSelectionChange: (keys: number[]) => void;
  doneIds: ReadonlySet<number>;
  onToggleDone: (pullRequestId: number, done: boolean) => void;
  onBulkMarkDone: (pullRequestIds: number[]) => void;
}): React.JSX.Element {
  const [hiddenColumns, setHiddenColumns] = useState<ReadonlySet<ColumnKey>>(new Set());
  const [sort, setSort] = useState<CherryPickSort>(DEFAULT_SORT);
  const { message } = App.useApp();
  const { openView: openWorkItemView, modal: workItemModal } = useWorkItemView();

  const authorFilters = useMemo(
    () => buildFilterOptions(results.flatMap((row) => (row.author ? [row.author] : []))),
    [results],
  );

  const statusFilters = useMemo(
    () => buildFilterOptions(results.map((row) => row.status)),
    [results],
  );

  const targetBranchFilters = useMemo(
    () => buildFilterOptions(results.map((row) => normalizeBranchName(row.targetBranch))),
    [results],
  );

  const selectedCandidates = useMemo(
    () => orderSelectedCandidates(results, selectedRowKeys, sort),
    [results, selectedRowKeys, sort],
  );

  const cherryPickPlan = useMemo(
    () => buildCherryPickCommand(selectedCandidates),
    [selectedCandidates],
  );

  async function copyCherryPickCommand(): Promise<void> {
    if (!cherryPickPlan.command) {
      return;
    }
    try {
      await navigator.clipboard.writeText(cherryPickPlan.command);
      if (cherryPickPlan.skippedPullRequestIds.length > 0) {
        message.warning(
          `Copied. Pull request ${cherryPickPlan.skippedPullRequestIds.join(", ")} has no merge commit yet (not completed) and was left out.`,
        );
      } else {
        message.success("Cherry-pick command copied to clipboard");
      }
    } catch {
      message.error("Could not copy the command.");
    }
  }

  function toggleColumn(key: ColumnKey, visible: boolean): void {
    setHiddenColumns((previous) => {
      const next = new Set(previous);
      if (visible) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  const handleTableChange: TableProps<PullRequestCandidate>["onChange"] = (
    _pagination,
    _filters,
    sorter,
  ) => {
    const next = Array.isArray(sorter) ? sorter[0] : sorter;
    if (
      next &&
      isCherryPickSortKey(next.columnKey) &&
      (next.order === "ascend" || next.order === "descend")
    ) {
      setSort({ key: next.columnKey, order: next.order });
      return;
    }
    setSort(null);
  };

  const allColumns: (ColumnsType<PullRequestCandidate>[number] & { key: ColumnKey })[] = [
    {
      key: "mergedDate",
      title: "Merged",
      dataIndex: "mergedDate",
      width: 140,
      sorter: (left, right) => (left.mergedDate ?? "").localeCompare(right.mergedDate ?? ""),
      sortOrder: sort?.key === "mergedDate" ? sort.order : null,
      render: (value: string | null) => formatDate(value),
    },
    {
      key: "title",
      title: "Title",
      dataIndex: "title",
      sorter: (left, right) => left.pullRequestId - right.pullRequestId,
      sortOrder: sort?.key === "title" ? sort.order : null,
      render: (title: string, row) => (
        <div className="flex flex-col gap-0.5 py-1">
          <div className="flex flex-wrap items-center gap-2">
            <a href={row.url} rel="noopener noreferrer" target="_blank">
              <Tag className="m-0 cursor-pointer" color="blue">
                !{row.pullRequestId}
              </Tag>
            </a>
            <Tag className="m-0" color="default">
              {normalizeBranchName(row.sourceBranch)}
            </Tag>
            {row.relatedWorkItemIds.map((workItemId) => (
              <Tag
                className="m-0 cursor-pointer"
                color="purple"
                key={workItemId}
                onClick={() => void openWorkItemView(workItemId)}
              >
                #{workItemId}
              </Tag>
            ))}
          </div>
          <span className="truncate text-slate-700 dark:text-slate-200" title={title}>
            {title}
          </span>
        </div>
      ),
    },
    {
      key: "author",
      title: "Author",
      dataIndex: "author",
      width: 160,
      filters: authorFilters,
      filterSearch: true,
      onFilter: (value, record) => record.author === (value as string),
      render: (value: string | null) => value ?? "—",
    },
    {
      key: "status",
      title: "Status",
      dataIndex: "status",
      width: 110,
      filters: statusFilters,
      onFilter: (value, record) => record.status === (value as string),
      render: (status: string) => <Tag color={STATUS_COLORS[status] ?? "default"}>{status}</Tag>,
    },
    {
      key: "targetBranch",
      title: "Target",
      dataIndex: "targetBranch",
      width: 100,
      ellipsis: true,
      filters: targetBranchFilters,
      filterSearch: true,
      onFilter: (value, record) => normalizeBranchName(record.targetBranch) === (value as string),
      render: (branch: string) => {
        const name = normalizeBranchName(branch);
        return (
          <Tag className="m-0 max-w-full truncate" title={name}>
            {name}
          </Tag>
        );
      },
    },
    {
      key: "done",
      title: "Done",
      dataIndex: "pullRequestId",
      width: 70,
      align: "center",
      render: (pullRequestId: number) => (
        <Checkbox
          checked={doneIds.has(pullRequestId)}
          onChange={(event) => onToggleDone(pullRequestId, event.target.checked)}
        />
      ),
    },
  ];

  const columns = allColumns.filter((column) => !hiddenColumns.has(column.key));

  return (
    <div>
      {workItemModal}
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="text-sm text-slate-600 dark:text-slate-300">
          {results.length} pull request{results.length === 1 ? "" : "s"} found
          {selectedRowKeys.length > 0 ? (
            <span className="ml-2 font-medium text-slate-900 dark:text-slate-50">
              · {selectedRowKeys.length} selected
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <Tooltip
            title={
              selectedRowKeys.length > 0
                ? `Mark ${selectedRowKeys.length} selected pull request${selectedRowKeys.length === 1 ? "" : "s"} done`
                : "Select pull requests to mark them done"
            }
          >
            <Button
              disabled={selectedRowKeys.length === 0}
              icon={<CheckOutlined />}
              onClick={() => onBulkMarkDone(selectedRowKeys)}
            >
              Mark Done
            </Button>
          </Tooltip>
          <Tooltip
            title={
              cherryPickPlan.commitHashes.length > 0
                ? `Copy a cherry-pick command for ${cherryPickPlan.commitHashes.length} selected commit${cherryPickPlan.commitHashes.length === 1 ? "" : "s"} in current table order`
                : "Select completed pull requests with a merge commit to build a cherry-pick command"
            }
          >
            <Button
              disabled={cherryPickPlan.commitHashes.length === 0}
              icon={<CopyOutlined />}
              onClick={() => void copyCherryPickCommand()}
            >
              Cherry-pick
            </Button>
          </Tooltip>
          <Dropdown
            popupRender={() => (
              <div className="min-w-[180px] rounded-md border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                {ALL_COLUMN_KEYS.map((key) => (
                  <div className="px-2 py-1" key={key}>
                    <Checkbox
                      checked={!hiddenColumns.has(key)}
                      onChange={(event) => toggleColumn(key, event.target.checked)}
                    >
                      {COLUMN_LABELS[key]}
                    </Checkbox>
                  </div>
                ))}
              </div>
            )}
            trigger={["click"]}
          >
            <Button icon={<SettingOutlined />}>Columns</Button>
          </Dropdown>
        </div>
      </div>

      <Table<PullRequestCandidate>
        columns={columns}
        dataSource={results}
        locale={{ emptyText: "No pull requests found." }}
        onChange={handleTableChange}
        pagination={false}
        rowKey="pullRequestId"
        rowSelection={{
          selectedRowKeys,
          onChange: (keys) => onSelectionChange(keys as number[]),
          getCheckboxProps: (row) => ({
            disabled: row.hashes.mergeCommit === null,
          }),
        }}
        scroll={{ x: "max-content" }}
      />
    </div>
  );
}
