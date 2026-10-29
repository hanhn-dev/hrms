"use client";

import { Alert, Drawer } from "antd";
import type { GitChangedFile, GitCommitDetail, GitFilePair } from "@hrms/azure-devops";
import { ChangedFiles } from "@/features/azure/git/changed-files";
import { FileDiff } from "@/features/azure/git/file-diff";
import { buildGitPullRequestUrl } from "@/features/azure/git/git-links";
import { shortCommit } from "@/features/azure/git/git-text";
import { formatDate } from "@/shared/format-date";
import { Text } from "@/shared/ui";

export function CommitDetailDrawer({
  open,
  loading,
  detail,
  organizationUrl,
  project,
  repositoryName,
  selectedPath,
  pair,
  pairLoading,
  pairError,
  onClose,
  onSelectFile,
}: {
  open: boolean;
  loading: boolean;
  detail: GitCommitDetail | null;
  organizationUrl: string;
  project: string;
  repositoryName: string;
  selectedPath: string | null;
  pair: GitFilePair | null;
  pairLoading: boolean;
  pairError: string | null;
  onClose: () => void;
  onSelectFile: (file: GitChangedFile) => void;
}): React.JSX.Element {
  const pullRequest = detail?.pullRequest ?? null;

  return (
    <Drawer
      destroyOnHidden
      open={open}
      placement="right"
      size="large"
      title={detail ? shortCommit(detail.commitId) : "Commit"}
      onClose={onClose}
    >
      {loading ? <Text type="secondary">Loading commit…</Text> : null}
      {detail ? (
        <div className="flex flex-col gap-3">
          <div>
            <Text>
              {detail.authorName ?? "Unknown author"} · {formatDate(detail.authoredAt)}
              {pullRequest ? (
                <>
                  {" "}
                  ·{" "}
                  <a
                    href={buildGitPullRequestUrl({
                      organizationUrl,
                      project,
                      repositoryName,
                      pullRequestId: pullRequest.id,
                    })}
                    rel="noreferrer"
                    target="_blank"
                  >
                    PR {pullRequest.id}
                  </a>
                </>
              ) : null}
            </Text>
            <p className="mt-1 text-sm whitespace-pre-wrap">{detail.comment ?? "—"}</p>
          </div>
          <ChangedFiles
            files={detail.files}
            selectedPath={selectedPath}
            truncated={detail.filesTruncated}
            onSelect={onSelectFile}
          />
          {pairError ? <Alert title={pairError} type="error" /> : null}
          {pairLoading ? <Text type="secondary">Loading diff…</Text> : null}
          {pair ? (
            <FileDiff
              leftLabel={detail.parentCommitId ? shortCommit(detail.parentCommitId) : "Before"}
              pair={pair}
              rightLabel={shortCommit(detail.commitId)}
            />
          ) : null}
        </div>
      ) : null}
    </Drawer>
  );
}
