"use client";

import { Button, Input, Modal, Space, Typography } from "antd";
import { useEffect, useMemo, useState } from "react";
import { JsonTreeEditor } from "@/shared/ui/json-tree-editor";
import { parseJsonText } from "@/shared/ui/json-text";

export function JsonEditorModal({
  open,
  title,
  value,
  readOnly,
  extraValidate,
  maxCompactLength,
  okText = "Preview save",
  disabledReason,
  onCancel,
  onSave,
}: {
  open: boolean;
  title: string;
  value: string | null;
  readOnly?: boolean;
  extraValidate?: (parsed: unknown) => string | null;
  maxCompactLength?: number;
  okText?: string;
  disabledReason?: string;
  onCancel: () => void;
  onSave: (compact: string | null) => void;
}): React.JSX.Element {
  const [data, setData] = useState<unknown>(null);
  const [brokenText, setBrokenText] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    const parsed = parseJsonText(value ?? "");
    if (parsed.ok) {
      setData(parsed.value);
      setBrokenText(null);
      return;
    }
    setData(null);
    setBrokenText(value ?? "");
  }, [open, value]);

  const parsedFromBroken = useMemo(
    () => (brokenText == null ? null : parseJsonText(brokenText)),
    [brokenText],
  );

  const workingValue = brokenText == null ? data : parsedFromBroken?.ok ? parsedFromBroken.value : null;
  const compact =
    brokenText != null && parsedFromBroken && !parsedFromBroken.ok
      ? null
      : workingValue == null
        ? null
        : JSON.stringify(workingValue);

  const status = useMemo(() => {
    if (brokenText != null && parsedFromBroken && !parsedFromBroken.ok) {
      return { valid: false, error: parsedFromBroken.error, compactLength: 0 };
    }
    const compactLength = compact?.length ?? 0;
    if (maxCompactLength != null && compactLength > maxCompactLength) {
      return {
        valid: false,
        error: `JSON must be at most ${maxCompactLength} characters when saved.`,
        compactLength,
      };
    }
    const extra = extraValidate?.(workingValue);
    if (extra) {
      return { valid: false, error: extra, compactLength };
    }
    return { valid: true, error: null, compactLength };
  }, [brokenText, compact, extraValidate, maxCompactLength, parsedFromBroken, workingValue]);

  function applyParsed(next: unknown): void {
    setData(next);
    setBrokenText(null);
  }

  function save(): void {
    if (readOnly || !status.valid) {
      return;
    }
    onSave(compact);
  }

  const showTree = workingValue != null && brokenText == null;
  const showBroken = brokenText != null && (parsedFromBroken == null || !parsedFromBroken.ok);

  return (
    <Modal
      cancelText={readOnly ? "Close" : "Cancel"}
      destroyOnHidden
      okButtonProps={
        readOnly
          ? { style: { display: "none" } }
          : {
              disabled: !status.valid,
              title: disabledReason ?? status.error ?? undefined,
            }
      }
      okText={okText}
      open={open}
      title={title}
      width={880}
      onCancel={onCancel}
      onOk={() => {
        save();
      }}
    >
      {showBroken ? (
        <>
          <Typography.Paragraph type="danger">
            JSON is malformed. Fix it below, then it becomes an inline editor.
          </Typography.Paragraph>
          <Input.TextArea
            className="font-mono"
            readOnly={readOnly}
            rows={12}
            spellCheck={false}
            value={brokenText}
            onChange={(event) => {
              const next = event.target.value;
              const parsed = parseJsonText(next);
              if (parsed.ok) {
                applyParsed(parsed.value);
                return;
              }
              setBrokenText(next);
            }}
          />
        </>
      ) : null}
      {showTree ? (
        <JsonTreeEditor
          readOnly={readOnly}
          value={workingValue}
          onChange={applyParsed}
        />
      ) : null}
      {!readOnly && brokenText == null && workingValue == null ? (
        <Space>
          <Button
            onClick={() => {
              applyParsed([]);
            }}
          >
            Start with array
          </Button>
          <Button
            onClick={() => {
              applyParsed({});
            }}
          >
            Start with object
          </Button>
        </Space>
      ) : null}
      {status.error ? (
        <Typography.Paragraph className="mb-0 mt-2" type="danger">
          {status.error}
        </Typography.Paragraph>
      ) : null}
      <Typography.Paragraph className="mb-0 mt-2" type="secondary">
        {maxCompactLength == null
          ? `${status.compactLength} characters (compact)`
          : `${status.compactLength} / ${maxCompactLength} characters (compact)`}
      </Typography.Paragraph>
    </Modal>
  );
}
