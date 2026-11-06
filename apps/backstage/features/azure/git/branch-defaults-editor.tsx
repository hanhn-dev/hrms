"use client";

import { Alert, Button, Form, Modal, Popconfirm } from "antd";
import { useState } from "react";
import type { GitBranchSummary } from "@hrms/azure-devops";
import type { BranchDefaultEntry, BranchDefaultsFile, ResolvedBranchDefaults } from "@/features/azure/git/branch-defaults";
import { errorMessage, rethrowRedirect } from "@/features/azure/git/git-text";
import { resetGitBranchDefaults, saveGitBranchDefaults } from "@/features/azure/git/queries";
import { SearchSelect } from "@/shared/ui";

export function BranchDefaultsEditor({
  repositoryName,
  branches,
  branchesLoading,
  saved,
  resolved,
  onSaved,
}: {
  repositoryName: string;
  branches: readonly GitBranchSummary[];
  branchesLoading: boolean;
  saved: BranchDefaultEntry | null;
  resolved: ResolvedBranchDefaults;
  onSaved: (file: BranchDefaultsFile) => void;
}): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [defaultBranch, setDefaultBranch] = useState("");
  const [leftBranch, setLeftBranch] = useState("");
  const [rightBranch, setRightBranch] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const options = branches.map((item) => ({ value: item.name, label: item.name }));
  const ready = defaultBranch.length > 0 && leftBranch.length > 0 && rightBranch.length > 0;

  function openEditor(): void {
    setDefaultBranch(resolved.history);
    setLeftBranch(resolved.left);
    setRightBranch(resolved.right);
    setError(null);
    setOpen(true);
  }

  async function save(): Promise<void> {
    setPending(true);
    setError(null);
    try {
      const file = await saveGitBranchDefaults({
        repositoryName,
        defaultBranch,
        leftBranch,
        rightBranch,
      });
      onSaved(file);
      setOpen(false);
    } catch (reason) {
      rethrowRedirect(reason);
      setError(errorMessage(reason));
    } finally {
      setPending(false);
    }
  }

  async function reset(): Promise<void> {
    setPending(true);
    setError(null);
    try {
      const file = await resetGitBranchDefaults(repositoryName);
      onSaved(file);
      setOpen(false);
    } catch (reason) {
      rethrowRedirect(reason);
      setError(errorMessage(reason));
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button disabled={branchesLoading || branches.length === 0} onClick={openEditor}>
        Branch defaults
      </Button>
      <Modal
        destroyOnHidden
        open={open}
        title={`Branch defaults · ${repositoryName}`}
        footer={
          <div className="flex items-center justify-between gap-2">
            {saved ? (
              <Popconfirm
                title="Reset to the built-in branches?"
                okText="Reset"
                onConfirm={() => void reset()}
              >
                <Button danger disabled={pending}>
                  Reset
                </Button>
              </Popconfirm>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button disabled={pending} onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button disabled={!ready} loading={pending} type="primary" onClick={() => void save()}>
                Save
              </Button>
            </div>
          </div>
        }
        onCancel={() => setOpen(false)}
      >
        <Form layout="vertical">
          <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">
            History opens on Default. Compare file opens with Left and Right. A branch you pick on those screens stays
            for that view.
          </p>
          {error ? <Alert className="mb-3" title={error} type="error" /> : null}
          <Form.Item label="Default" required>
            <SearchSelect
              aria-label="Default branch"
              options={options}
              value={defaultBranch || undefined}
              onChange={(value) => setDefaultBranch(String(value))}
            />
          </Form.Item>
          <Form.Item label="Left" required>
            <SearchSelect
              aria-label="Left branch"
              options={options}
              value={leftBranch || undefined}
              onChange={(value) => setLeftBranch(String(value))}
            />
          </Form.Item>
          <Form.Item label="Right" required>
            <SearchSelect
              aria-label="Right branch"
              options={options}
              value={rightBranch || undefined}
              onChange={(value) => setRightBranch(String(value))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
