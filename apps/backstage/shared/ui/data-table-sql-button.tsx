"use client";

import { CodeOutlined } from "@ant-design/icons";
import { App, Button, Modal, Tooltip, Typography } from "antd";
import { useMemo, useState } from "react";
import { formatTableQueryScript } from "@/shared/ui/data-table-sql";

export function TableSqlButton({
  script,
}: {
  script: string;
}): React.JSX.Element {
  const { message } = App.useApp();
  const [open, setOpen] = useState(false);
  const formatted = useMemo(() => formatTableQueryScript(script), [script]);
  const display = formatted.sql;

  async function copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(display);
      message.success("Copied SQL");
    } catch {
      message.error("Could not copy SQL.");
    }
  }

  return (
    <>
      <Tooltip title="Show SQL for this table">
        <Button
          aria-label="Show SQL for this table"
          htmlType="button"
          icon={<CodeOutlined />}
          size="small"
          type="text"
          onClick={() => {
            setOpen(true);
          }}
        />
      </Tooltip>
      <Modal
        cancelText="Close"
        destroyOnHidden
        okButtonProps={{ disabled: display === "" }}
        okText="Copy"
        open={open}
        title="SQL"
        width={800}
        onCancel={() => {
          setOpen(false);
        }}
        onOk={() => {
          void copy();
        }}
      >
        {display === "" ? (
          <Typography.Text type="secondary">
            No SQL was recorded for this table.
          </Typography.Text>
        ) : (
          <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap rounded bg-slate-900 p-3 text-xs text-slate-100">
            {display}
          </pre>
        )}
      </Modal>
    </>
  );
}
