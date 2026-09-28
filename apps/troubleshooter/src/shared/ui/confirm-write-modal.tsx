"use client";

import { App, Button, Input, Modal, Space, Table, Typography } from "antd";
import { useEffect, useRef, useState } from "react";

export type PreviewResult = {
  token: string;
  preview: Array<Record<string, unknown>>;
  note?: string;
  sql?: string;
};

export type CommitResult = {
  after: Array<Record<string, unknown>>;
  note?: string;
  sql?: string;
};

export function ConfirmWriteModal({
  title,
  buttonLabel,
  disabled,
  disabledReason,
  previewAction,
  commitAction,
  successMessage,
  onDone,
  open: openProp,
  onOpenChange,
  hideTrigger,
}: {
  title: string;
  buttonLabel: string;
  disabled?: boolean;
  disabledReason?: string;
  previewAction: () => Promise<PreviewResult>;
  commitAction: (token: string) => Promise<CommitResult>;
  successMessage: string;
  onDone?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
}): React.JSX.Element {
  const { message } = App.useApp();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [preview, setPreview] = useState<Array<Record<string, unknown>>>([]);
  const [note, setNote] = useState<string | null>(null);
  const [sql, setSql] = useState<string | null>(null);
  const [committed, setCommitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const previewActionRef = useRef(previewAction);
  previewActionRef.current = previewAction;

  const controlled = openProp !== undefined;
  const open = controlled ? openProp : uncontrolledOpen;

  function reset(): void {
    setToken(null);
    setPreview([]);
    setNote(null);
    setSql(null);
    setCommitted(false);
    setError(null);
  }

  function setOpen(next: boolean): void {
    if (!controlled) {
      setUncontrolledOpen(next);
    }
    onOpenChange?.(next);
  }

  function close(): void {
    setOpen(false);
    reset();
  }

  function applyPreview(result: PreviewResult): void {
    setToken(result.token);
    setPreview(result.preview);
    setNote(result.note ?? null);
    setSql(result.sql ?? null);
    setCommitted(false);
  }

  async function runPreview(): Promise<void> {
    reset();
    setLoading(true);
    try {
      applyPreview(await previewActionRef.current());
    } catch (previewError) {
      setError(
        previewError instanceof Error
          ? previewError.message
          : "Preview failed.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function openPreview(): Promise<void> {
    setOpen(true);
    if (controlled) {
      return;
    }
    await runPreview();
  }

  useEffect(() => {
    if (!controlled) {
      return;
    }
    if (!open) {
      reset();
      return;
    }
    let cancelled = false;
    async function load(): Promise<void> {
      reset();
      setLoading(true);
      try {
        const result = await previewActionRef.current();
        if (cancelled) {
          return;
        }
        applyPreview(result);
      } catch (previewError) {
        if (cancelled) {
          return;
        }
        setError(
          previewError instanceof Error
            ? previewError.message
            : "Preview failed.",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [controlled, open]);

  async function commit(): Promise<void> {
    if (!token || loading || committed) {
      return;
    }
    setLoading(true);
    try {
      const result = await commitAction(token);
      const nextSql = result.sql ?? sql;
      setNote(result.note ?? note);
      setSql(nextSql);
      setLoading(false);
      message.success(successMessage);
      onDone?.();
      if (nextSql) {
        setCommitted(true);
        setToken(null);
        return;
      }
      close();
    } catch (commitError) {
      setError(
        commitError instanceof Error ? commitError.message : "Commit failed.",
      );
      setLoading(false);
    }
  }

  async function copySql(): Promise<void> {
    if (!sql) {
      return;
    }
    try {
      await navigator.clipboard.writeText(sql);
      message.success("SQL copied.");
    } catch {
      message.error("Could not copy SQL.");
    }
  }

  const columns = [
    ...new Set(preview.flatMap((row) => Object.keys(row))),
  ].map((key) => ({
    title: key,
    dataIndex: key,
    key,
    render: (value: unknown) => String(value ?? ""),
  }));

  return (
    <>
      {hideTrigger ? null : (
        <Button
          disabled={disabled}
          title={disabledReason}
          type="primary"
          onClick={() => {
            void openPreview();
          }}
        >
          {buttonLabel}
        </Button>
      )}
      <Modal
        confirmLoading={loading}
        destroyOnHidden
        footer={
          committed
            ? [
                <Button key="close" type="primary" onClick={close}>
                  Close
                </Button>,
              ]
            : undefined
        }
        okButtonProps={{ disabled: !token }}
        okText="Commit"
        open={open}
        title={title}
        width={880}
        onCancel={() => {
          if (loading) {
            return;
          }
          close();
        }}
        onOk={
          committed
            ? undefined
            : () => {
                void commit();
              }
        }
      >
        {error ? (
          <Typography.Paragraph type="danger">{error}</Typography.Paragraph>
        ) : null}
        {note ? (
          <Typography.Paragraph type="secondary">{note}</Typography.Paragraph>
        ) : null}
        <Table
          columns={columns}
          dataSource={preview.map((row, index) => ({
            key: index,
            ...row,
          }))}
          pagination={false}
          size="small"
        />
        {sql ? (
          <div className="mt-4">
            <Space className="mb-2 w-full justify-between">
              <Typography.Text strong>
                {committed
                  ? "Replay SQL for other environments"
                  : "Replay SQL (copy after commit, or now)"}
              </Typography.Text>
              <Button size="small" onClick={() => void copySql()}>
                Copy
              </Button>
            </Space>
            <Input.TextArea
              readOnly
              autoSize={{ minRows: 8, maxRows: 16 }}
              className="font-mono text-xs"
              value={sql}
            />
          </div>
        ) : null}
      </Modal>
    </>
  );
}
