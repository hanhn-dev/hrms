"use client";

import { ArrowLeftOutlined } from "@ant-design/icons";
import { Alert, Button, Modal, Spin, Tabs, Tag } from "antd";
import type {
  PullRequestCandidate,
  WorkItem,
  WorkItemAttachment,
  WorkItemComment,
  WorkItemCommentsResponse,
} from "@hrms/azure-devops";
import {
  WorkItemStateTag,
  WorkItemTypeTag,
} from "@/features/azure/board/work-item-tags";
import { formatAttachmentSize } from "@/features/azure/work-item/format-attachment-size";
import { WorkItemMarkdown } from "@/features/azure/work-item/work-item-markdown";
import { formatDate } from "@/shared/format-date";

const STATUS_COLORS: Record<string, string> = {
  active: "blue",
  completed: "green",
  abandoned: "red",
  not_set: "default",
};

function normalizeBranchName(branch: string): string {
  return branch.replace(/^refs\/heads\//, "");
}

function MarkdownSection({
  title,
  content,
}: {
  title: string;
  content: string;
}): React.JSX.Element | null {
  if (!content.trim()) {
    return null;
  }
  return (
    <section>
      <h3 className="mb-1 text-sm font-semibold">{title}</h3>
      <WorkItemMarkdown content={content} />
    </section>
  );
}

function CommentsTab({
  loading,
  error,
  comments,
}: {
  loading: boolean;
  error: string | null;
  comments: WorkItemCommentsResponse | null;
}): React.JSX.Element {
  if (error) {
    return <Alert showIcon title={error} type="error" />;
  }
  if (loading && !comments) {
    return (
      <div className="flex justify-center py-8">
        <Spin />
      </div>
    );
  }
  if (!comments || comments.comments.length === 0) {
    return <p className="text-slate-500">No comments.</p>;
  }
  return (
    <div className="flex flex-col gap-4">
      {comments.comments.map((comment: WorkItemComment) => (
        <article className="border-b border-slate-200 pb-3 last:border-0 dark:border-slate-700" key={comment.id}>
          <div className="mb-1 flex flex-wrap items-baseline gap-2 text-sm">
            <span className="font-medium">{comment.author ?? "Unknown"}</span>
            <span className="text-slate-500">{formatDate(comment.createdDate)}</span>
          </div>
          {comment.text.trim() ? (
            <WorkItemMarkdown content={comment.text} />
          ) : (
            <p className="text-sm text-slate-500">No comment text.</p>
          )}
        </article>
      ))}
      {comments.hasMore ? (
        <p className="text-sm text-slate-500">
          Showing {comments.comments.length} of {comments.totalCount} comments. Open in Azure DevOps for the rest.
        </p>
      ) : null}
    </div>
  );
}

function AttachmentsTab({ attachments }: { attachments: readonly WorkItemAttachment[] }): React.JSX.Element {
  if (attachments.length === 0) {
    return <p className="text-slate-500">No attachments.</p>;
  }
  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0">
      {attachments.map((attachment) => (
        <li className="flex flex-wrap items-center gap-2 text-sm" key={attachment.id}>
          <a href={attachment.url} rel="noopener noreferrer" target="_blank">
            {attachment.name}
          </a>
          <Tag>{attachment.isImage ? "Image" : "File"}</Tag>
          <span className="text-slate-500">{formatAttachmentSize(attachment.size)}</span>
          {attachment.comment ? <span className="text-slate-500">{attachment.comment}</span> : null}
        </li>
      ))}
    </ul>
  );
}

function PullRequestsTab({
  loading,
  error,
  pullRequests,
}: {
  loading: boolean;
  error: string | null;
  pullRequests: readonly PullRequestCandidate[] | null;
}): React.JSX.Element {
  if (error) {
    return <Alert showIcon title={error} type="error" />;
  }
  if (loading && !pullRequests) {
    return (
      <div className="flex justify-center py-8">
        <Spin />
      </div>
    );
  }
  if (!pullRequests || pullRequests.length === 0) {
    return <p className="text-slate-500">No linked pull requests.</p>;
  }
  return (
    <ul className="m-0 flex list-none flex-col gap-3 p-0">
      {pullRequests.map((pr) => (
        <li className="border-b border-slate-200 pb-3 last:border-0 dark:border-slate-700" key={pr.pullRequestId}>
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <a href={pr.url} rel="noopener noreferrer" target="_blank">
              #{pr.pullRequestId}
            </a>
            <Tag color={STATUS_COLORS[pr.status] ?? "default"}>{pr.status}</Tag>
          </div>
          <div className="text-sm">{pr.title}</div>
          <div className="mt-1 text-sm text-slate-500">
            {pr.author ?? "Unknown"} · {normalizeBranchName(pr.targetBranch)}
            {pr.repositoryName ? ` · ${pr.repositoryName}` : ""}
          </div>
        </li>
      ))}
    </ul>
  );
}

export type WorkItemDetailTab = "comments" | "attachments" | "pull-requests";

export function WorkItemDetailModal({
  open,
  loading,
  error,
  detail,
  parentSummary,
  backTarget,
  comments,
  commentsLoading,
  commentsError,
  pullRequestCount,
  pullRequests,
  pullRequestsLoading,
  pullRequestsError,
  activeTab,
  onTabChange,
  onOpenWorkItem,
  onBack,
  onClose,
}: {
  open: boolean;
  loading: boolean;
  error: string | null;
  detail: WorkItem | null;
  /** Loaded parent title/type when detail.parentId is set. */
  parentSummary: { id: number; title: string; type: string } | null;
  /** Previous item in the modal navigation stack, when the user drilled in. */
  backTarget: { id: number; title: string } | null;
  comments: WorkItemCommentsResponse | null;
  commentsLoading: boolean;
  commentsError: string | null;
  pullRequestCount: number | null;
  pullRequests: readonly PullRequestCandidate[] | null;
  pullRequestsLoading: boolean;
  pullRequestsError: string | null;
  activeTab: WorkItemDetailTab;
  onTabChange: (tab: WorkItemDetailTab) => void;
  onOpenWorkItem: (id: number) => void;
  onBack: () => void;
  onClose: () => void;
}): React.JSX.Element {
  const prTabCount = pullRequests?.length ?? pullRequestCount;
  const parentId = detail?.parentId ?? null;
  const titleText = detail ? `#${detail.id} — ${detail.title}` : "Work item";
  return (
    <Modal
      destroyOnHidden
      footer={null}
      open={open}
      title={
        <div className="flex min-w-0 flex-col gap-1 pr-6">
          {backTarget != null ? (
            <Button
              className="!h-auto max-w-full !px-0"
              icon={<ArrowLeftOutlined />}
              type="link"
              onClick={onBack}
            >
              <span className="truncate">
                Back to #{backTarget.id}
                {backTarget.title ? ` — ${backTarget.title}` : ""}
              </span>
            </Button>
          ) : null}
          <span className="truncate">{titleText}</span>
        </div>
      }
      width={1120}
      styles={{ body: { maxHeight: "80vh", overflowY: "auto" } }}
      onCancel={onClose}
    >
      {error ? <Alert className="mb-3" showIcon title={error} type="error" /> : null}
      {loading && !detail ? (
        <div className="flex justify-center py-8">
          <Spin />
        </div>
      ) : null}
      {detail ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <WorkItemTypeTag type={detail.type} />
            <WorkItemStateTag state={detail.state} />
            {detail.tags.map((tag) => (
              <Tag key={tag}>{tag}</Tag>
            ))}
          </div>
          <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(16rem,20rem)]">
            <div className="flex min-w-0 flex-col gap-3">
              <MarkdownSection content={detail.description} title="Description" />
              <MarkdownSection content={detail.reproSteps} title="Repro steps" />
              <MarkdownSection content={detail.acceptanceCriteria} title="Acceptance criteria" />
              {!detail.description.trim() &&
              !detail.reproSteps.trim() &&
              !detail.acceptanceCriteria.trim() ? (
                <p className="text-slate-500">No description.</p>
              ) : null}
            </div>
            <aside className="min-w-0 border-t border-slate-200 pt-4 md:border-t-0 md:border-l md:pt-0 md:pl-6 dark:border-slate-700">
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-sm">
                <dt className="text-slate-500 dark:text-slate-400">Assigned to</dt>
                <dd className="break-words">{detail.assignedTo ?? "Unassigned"}</dd>
                {parentId != null ? (
                  <>
                    <dt className="text-slate-500 dark:text-slate-400">Parent</dt>
                    <dd className="min-w-0 break-words">
                      <button
                        className="cursor-pointer border-0 bg-transparent p-0 text-left text-blue-600 hover:underline"
                        type="button"
                        onClick={() => {
                          onOpenWorkItem(parentId);
                        }}
                      >
                        #{parentId}
                        {parentSummary != null && parentSummary.id === parentId
                          ? ` — ${parentSummary.title}`
                          : ""}
                      </button>
                      {parentSummary != null && parentSummary.id === parentId ? (
                        <div className="mt-0.5">
                          <WorkItemTypeTag type={parentSummary.type} />
                        </div>
                      ) : null}
                    </dd>
                  </>
                ) : null}
                <dt className="text-slate-500 dark:text-slate-400">Iteration</dt>
                <dd className="break-words">{detail.iterationPath || "—"}</dd>
                <dt className="text-slate-500 dark:text-slate-400">Area</dt>
                <dd className="break-words">{detail.areaPath || "—"}</dd>
                {detail.priority != null ? (
                  <>
                    <dt className="text-slate-500 dark:text-slate-400">Priority</dt>
                    <dd>{detail.priority}</dd>
                  </>
                ) : null}
                {detail.severity ? (
                  <>
                    <dt className="text-slate-500 dark:text-slate-400">Severity</dt>
                    <dd>{detail.severity}</dd>
                  </>
                ) : null}
                <dt className="text-slate-500 dark:text-slate-400">Created</dt>
                <dd>{formatDate(detail.createdDate)}</dd>
                <dt className="text-slate-500 dark:text-slate-400">Changed</dt>
                <dd>{formatDate(detail.changedDate)}</dd>
              </dl>
              <a
                className="mt-4 inline-block"
                href={detail.url}
                rel="noopener noreferrer"
                target="_blank"
              >
                Open in Azure DevOps
              </a>
            </aside>
          </div>
          <Tabs
            activeKey={activeTab}
            items={[
              {
                key: "comments",
                label: comments ? `Comments (${comments.totalCount})` : "Comments",
                children: (
                  <CommentsTab comments={comments} error={commentsError} loading={commentsLoading} />
                ),
              },
              {
                key: "attachments",
                label: `Attachments (${detail.attachments.length})`,
                children: <AttachmentsTab attachments={detail.attachments} />,
              },
              {
                key: "pull-requests",
                label:
                  prTabCount != null ? `Pull requests (${prTabCount})` : "Pull requests",
                children: (
                  <PullRequestsTab
                    error={pullRequestsError}
                    loading={pullRequestsLoading}
                    pullRequests={pullRequests}
                  />
                ),
              },
            ]}
            onChange={(key) => {
              if (key === "comments" || key === "attachments" || key === "pull-requests") {
                onTabChange(key);
              }
            }}
          />
        </div>
      ) : null}
    </Modal>
  );
}
