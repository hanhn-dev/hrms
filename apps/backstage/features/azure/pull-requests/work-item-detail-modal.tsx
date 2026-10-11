"use client";

import { Alert, Modal, Spin, Tag } from "antd";
import type { WorkItem } from "@hrms/azure-devops";
import { formatDate } from "@/shared/format-date";

export function WorkItemDetailModal({
  open,
  loading,
  error,
  detail,
  onClose,
}: {
  open: boolean;
  loading: boolean;
  error: string | null;
  detail: WorkItem | null;
  onClose: () => void;
}): React.JSX.Element {
  return (
    <Modal
      destroyOnHidden
      footer={null}
      open={open}
      title={detail ? `${detail.id}: ${detail.title}` : "Work item"}
      width={640}
      onCancel={onClose}
    >
      {error ? <Alert className="mb-3" showIcon title={error} type="error" /> : null}
      {loading && !detail ? (
        <div className="flex justify-center py-8">
          <Spin />
        </div>
      ) : null}
      {detail ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Tag>{detail.type}</Tag>
            <Tag color="blue">{detail.state}</Tag>
            {detail.tags.map((tag) => (
              <Tag key={tag}>{tag}</Tag>
            ))}
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
            <dt className="text-slate-500 dark:text-slate-400">Assigned to</dt>
            <dd>{detail.assignedTo ?? "Unassigned"}</dd>
            <dt className="text-slate-500 dark:text-slate-400">Iteration</dt>
            <dd>{detail.iterationPath || "—"}</dd>
            <dt className="text-slate-500 dark:text-slate-400">Changed</dt>
            <dd>{formatDate(detail.changedDate)}</dd>
          </dl>
          <a href={detail.url} rel="noopener noreferrer" target="_blank">
            Open in Azure DevOps
          </a>
        </div>
      ) : null}
    </Modal>
  );
}
