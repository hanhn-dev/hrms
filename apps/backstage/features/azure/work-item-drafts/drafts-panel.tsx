"use client";

import { useState, useTransition } from "react";
import { Alert, Button, Modal, Space, Table, Tag, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  publishWorkItemDraft,
  rejectWorkItemDraft,
  type WorkItemDraft,
} from "@/features/azure/work-item-drafts/queries";
import { formatDate } from "@/shared/format-date";

function statusColor(status: WorkItemDraft["status"]): string {
  if (status === "pending") {
    return "blue";
  }
  if (status === "published") {
    return "green";
  }
  return "default";
}

export function WorkItemDraftsPanel({
  initialDrafts,
}: {
  initialDrafts: WorkItemDraft[];
}): React.JSX.Element {
  const [drafts, setDrafts] = useState(initialDrafts);
  const [selected, setSelected] = useState<WorkItemDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function refreshLocal(next: WorkItemDraft): void {
    setDrafts((prev) => {
      const without = prev.filter((row) => row.id !== next.id);
      return [next, ...without].sort((a, b) => {
        const statusRank = Number(b.status === "pending") - Number(a.status === "pending");
        if (statusRank !== 0) {
          return statusRank;
        }
        return b.createdAt.localeCompare(a.createdAt);
      });
    });
    setSelected(next);
  }

  function onPublish(): void {
    if (!selected || selected.status !== "pending") {
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const result = await publishWorkItemDraft(selected.id);
        refreshLocal(result.draft);
        message.success(`Published as work item ${result.workItem.id}`);
      } catch (publishError) {
        setError(
          publishError instanceof Error ? publishError.message : "Failed to publish draft.",
        );
      }
    });
  }

  function onReject(): void {
    if (!selected || selected.status !== "pending") {
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const next = await rejectWorkItemDraft(selected.id, "Rejected in Backstage review");
        refreshLocal(next);
        message.success("Draft rejected");
      } catch (rejectError) {
        setError(rejectError instanceof Error ? rejectError.message : "Failed to reject draft.");
      }
    });
  }

  const columns: ColumnsType<WorkItemDraft> = [
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 110,
      render: (status: WorkItemDraft["status"]) => (
        <Tag color={statusColor(status)}>{status}</Tag>
      ),
    },
    {
      title: "Object",
      key: "object",
      render: (_value, row) => (
        <span>
          {row.objectName}{" "}
          <span className="text-slate-500 dark:text-slate-400">
            ({row.databaseSlug} · {row.objectType})
          </span>
        </span>
      ),
    },
    {
      title: "Title",
      dataIndex: "title",
      key: "title",
      ellipsis: true,
    },
    {
      title: "Created",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 170,
      render: (value: string) => formatDate(value),
    },
    {
      title: "ADO",
      key: "ado",
      width: 100,
      render: (_value, row) => (row.adoWorkItemId != null ? String(row.adoWorkItemId) : "—"),
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      {error ? <Alert showIcon title={error} type="error" /> : null}
      <Table<WorkItemDraft>
        columns={columns}
        dataSource={drafts}
        locale={{ emptyText: "No work-item drafts yet. Run /improve-sql-performance first." }}
        pagination={{ pageSize: 20 }}
        rowKey="id"
        size="middle"
        onRow={(row) => ({
          onClick: () => {
            setError(null);
            setSelected(row);
          },
          style: { cursor: "pointer" },
        })}
      />
      <Modal
        destroyOnHidden
        footer={
          selected?.status === "pending" ? (
            <Space>
              <Button disabled={pending} onClick={() => setSelected(null)}>
                Close
              </Button>
              <Button danger disabled={pending} loading={pending} onClick={onReject}>
                Reject
              </Button>
              <Button disabled={pending} loading={pending} type="primary" onClick={onPublish}>
                Publish to Azure DevOps
              </Button>
            </Space>
          ) : (
            <Button onClick={() => setSelected(null)}>Close</Button>
          )
        }
        open={selected != null}
        title={selected?.title ?? "Draft"}
        width={880}
        onCancel={() => setSelected(null)}
      >
        {selected ? (
          <div className="flex max-h-[70vh] flex-col gap-3 overflow-y-auto">
            <div className="flex flex-wrap items-center gap-2">
              <Tag color={statusColor(selected.status)}>{selected.status}</Tag>
              <Tag>{selected.objectType}</Tag>
              {selected.tags.map((tag) => (
                <Tag key={tag}>{tag}</Tag>
              ))}
              {selected.adoWorkItemId != null ? (
                <Tag color="green">ADO #{selected.adoWorkItemId}</Tag>
              ) : null}
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
              <dt className="text-slate-500 dark:text-slate-400">Object</dt>
              <dd>
                {selected.objectName} ({selected.databaseSlug})
              </dd>
              <dt className="text-slate-500 dark:text-slate-400">Source</dt>
              <dd className="break-all">{selected.sourcePath}</dd>
              <dt className="text-slate-500 dark:text-slate-400">Created</dt>
              <dd>{formatDate(selected.createdAt)}</dd>
            </dl>
            <div className="prose prose-slate max-w-none dark:prose-invert">
              <Markdown remarkPlugins={[remarkGfm]}>{selected.description}</Markdown>
            </div>
            <div>
              <h3 className="mb-1 text-sm font-semibold">Acceptance criteria</h3>
              <pre className="whitespace-pre-wrap rounded border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-900">
                {selected.acceptanceCriteria}
              </pre>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
