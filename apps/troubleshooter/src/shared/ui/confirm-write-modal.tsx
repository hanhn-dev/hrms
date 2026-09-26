"use client";

import { Button, Modal, Table, Typography } from "antd";
import { useState, useTransition } from "react";

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
  onDone,
}: {
  title: string;
  buttonLabel: string;
  disabled?: boolean;
  disabledReason?: string;
  previewAction: () => Promise<PreviewResult>;
  commitAction: (token: string) => Promise<CommitResult>;
  onDone?: () => void;
}): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [preview, setPreview] = useState<Array<Record<string, unknown>>>([]);
  const [after, setAfter] = useState<Array<Record<string, unknown>>>([]);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset(): void {
    setToken(null);
    setPreview([]);
    setAfter([]);
    setNote(null);
    setError(null);
  }

  function openPreview(): void {
    reset();
    setOpen(true);
    startTransition(async () => {
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
      }
    });
  }

  function commit(): void {
    if (!token) {
      return;
    }
    startTransition(async () => {
      try {
        const result = await commitAction(token);
        setAfter(result.after);
        setNote(result.note ?? null);
        onDone?.();
      } catch (commitError) {
        setError(
          commitError instanceof Error ? commitError.message : "Commit failed.",
        );
      }
    });
  }

  const columns =
    preview[0] != null
      ? Object.keys(preview[0]).map((key) => ({
          title: key,
          dataIndex: key,
          key,
          render: (value: unknown) => String(value ?? ""),
        }))
      : after[0] != null
        ? Object.keys(after[0]).map((key) => ({
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
        onClick={openPreview}
      >
        {buttonLabel}
      </Button>
      <Modal
        confirmLoading={pending}
        okButtonProps={{ disabled: !token || after.length > 0 }}
        okText="Commit"
        open={open}
        title={title}
        width={880}
        onCancel={() => {
          setOpen(false);
          reset();
        }}
        onOk={commit}
      >
        {error ? (
          <Typography.Paragraph type="danger">{error}</Typography.Paragraph>
        ) : null}
        {note ? (
          <Typography.Paragraph type="secondary">{note}</Typography.Paragraph>
        ) : null}
        <Table
          columns={columns}
          dataSource={(after.length > 0 ? after : preview).map((row, index) => ({
            key: index,
            ...row,
          }))}
          pagination={false}
          scroll={{ x: "max-content" }}
          size="small"
        />
      </Modal>
    </>
  );
}
