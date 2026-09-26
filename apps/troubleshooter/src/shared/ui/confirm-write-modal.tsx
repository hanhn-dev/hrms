"use client";

import { App, Button, Modal, Table, Typography } from "antd";
import { useState } from "react";

type PreviewResult = {
  token: string;
  preview: Array<Record<string, unknown>>;
  note?: string;
};

type CommitResult = {
  after: Array<Record<string, unknown>>;
  note?: string;
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
}: {
  title: string;
  buttonLabel: string;
  disabled?: boolean;
  disabledReason?: string;
  previewAction: () => Promise<PreviewResult>;
  commitAction: (token: string) => Promise<CommitResult>;
  successMessage: string;
  onDone?: () => void;
}): React.JSX.Element {
  const { message } = App.useApp();
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [preview, setPreview] = useState<Array<Record<string, unknown>>>([]);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function reset(): void {
    setToken(null);
    setPreview([]);
    setNote(null);
    setError(null);
  }

  function close(): void {
    setOpen(false);
    reset();
  }

  async function openPreview(): Promise<void> {
    reset();
    setOpen(true);
    setLoading(true);
    try {
      const result = await previewAction();
      setToken(result.token);
      setPreview(result.preview);
      setNote(result.note ?? null);
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

  async function commit(): Promise<void> {
    if (!token || loading) {
      return;
    }
    setLoading(true);
    try {
      await commitAction(token);
      setLoading(false);
      close();
      message.success(successMessage);
      onDone?.();
    } catch (commitError) {
      setError(
        commitError instanceof Error ? commitError.message : "Commit failed.",
      );
      setLoading(false);
    }
  }

  const columns =
    preview[0] != null
      ? Object.keys(preview[0]).map((key) => ({
          title: key,
          dataIndex: key,
          key,
          render: (value: unknown) => String(value ?? ""),
        }))
      : [];

  return (
    <>
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
      <Modal
        confirmLoading={loading}
        destroyOnHidden
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
        onOk={() => {
          void commit();
        }}
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
      </Modal>
    </>
  );
}
