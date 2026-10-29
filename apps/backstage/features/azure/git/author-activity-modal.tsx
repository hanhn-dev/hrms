"use client";

import { Modal, Table, Tag } from "antd";
import { useEffect, useState } from "react";
import type { GitAuthorActivity, GitAuthorPullRequest, GitCommitSummary } from "@hrms/azure-devops";
import { buildGitCommitUrl, buildGitPullRequestUrl } from "@/features/azure/git/git-links";
import { errorMessage, firstCommitLine, rethrowRedirect, shortCommit } from "@/features/azure/git/git-text";
import { loadGitAuthorActivity } from "@/features/azure/git/queries";
import { formatDate } from "@/shared/format-date";
import { Text } from "@/shared/ui";

const STATUS_COLOR: Record<string, string> = {
  Active: "blue",
  Completed: "green",
  Abandoned: "default",
};

export function AuthorActivityModal({
  authorName,
  creatorId,
  repositoryId,
  repositoryName,
  organizationUrl,
  project,
  branch,
  onClose,
}: {
  authorName: string | null;
  creatorId: string | null;
  repositoryId: string;
  repositoryName: string;
  organizationUrl: string;
  project: string;
  branch: string;
  onClose: () => void;
}): React.JSX.Element {
  const [activity, setActivity] = useState<GitAuthorActivity | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authorName === null || branch.length === 0) {
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setActivity(null);
    loadGitAuthorActivity({
      repositoryId,
      authorName,
      branch,
      creatorId,
    })
      .then((result) => {
        if (!cancelled) {
          setActivity(result);
        }
      })
      .catch((loadError: unknown) => {
        rethrowRedirect(loadError);
        if (!cancelled) {
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
  }, [authorName, branch, creatorId, repositoryId]);

  return (
    <Modal
      destroyOnHidden
      footer={null}
      open={authorName !== null}
      title={authorName ?? "Author"}
      width={840}
      onCancel={onClose}
    >
      {error ? <Text type="danger">{error}</Text> : null}
      {creatorId === null && authorName !== null ? (
        <p className="mb-3 text-sm text-slate-500">
          This name is not on an Azure DevOps project team, so pull requests cannot be matched. Commits on {branch}{" "}
          are listed below.
        </p>
      ) : null}
      <Text>Pull requests in {repositoryName}</Text>
      <Table<GitAuthorPullRequest>
        className="mt-2 mb-4"
        columns={[
          {
            title: "PR",
            dataIndex: "id",
            width: 90,
            render: (id: number) => (
              <a
                href={buildGitPullRequestUrl({
                  organizationUrl,
                  project,
                  repositoryName,
                  pullRequestId: id,
                })}
                rel="noreferrer"
                target="_blank"
              >
                {id}
              </a>
            ),
          },
          { title: "Title", dataIndex: "title" },
          {
            title: "Status",
            dataIndex: "status",
            width: 120,
            render: (status: string) => <Tag color={STATUS_COLOR[status] ?? "default"}>{status}</Tag>,
          },
          {
            title: "Opened",
            dataIndex: "createdAt",
            width: 190,
            render: (value: string | null) => formatDate(value),
          },
        ]}
        dataSource={activity?.pullRequests ?? []}
        loading={loading}
        locale={{ emptyText: loading ? "Loading…" : "No pull requests." }}
        pagination={false}
        rowKey="id"
        scroll={{ y: 220 }}
        size="small"
      />
      <Text>Commits on {branch || "this branch"}</Text>
      <Table<GitCommitSummary>
        className="mt-2"
        columns={[
          {
            title: "Commit",
            dataIndex: "commitId",
            width: 110,
            render: (commitId: string) => (
              <a
                href={buildGitCommitUrl({ organizationUrl, project, repositoryName, commitId })}
                rel="noreferrer"
                target="_blank"
              >
                {shortCommit(commitId)}
              </a>
            ),
          },
          {
            title: "When",
            dataIndex: "authoredAt",
            width: 190,
            render: (value: string | null) => formatDate(value),
          },
          {
            title: "Message",
            dataIndex: "comment",
            render: (comment: string | null) => firstCommitLine(comment),
          },
        ]}
        dataSource={activity?.commits ?? []}
        loading={loading}
        locale={{ emptyText: loading ? "Loading…" : "No commits." }}
        pagination={false}
        rowKey="commitId"
        scroll={{ y: 220 }}
        size="small"
      />
    </Modal>
  );
}
