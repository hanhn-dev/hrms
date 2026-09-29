"use client";

import { CheckOutlined, CloseOutlined, EditOutlined } from "@ant-design/icons";
import { App, Button, Form, Space, Table, Tooltip } from "antd";
import type { TablePaginationConfig, TableProps } from "antd";
import { useState } from "react";
import { ConfirmWriteModal } from "@/shared/ui/confirm-write-modal";
import { EditableCell } from "./editable-cell";
import type { ConfirmWriteConfig, EditableColumn } from "./types";

type EditableTableProps<T extends object> = Omit<TableProps<T>, "columns" | "components"> & {
  columns: Array<EditableColumn<T>>;
  writesEnabled?: boolean;
  confirmWrite?: ConfirmWriteConfig<T>;
};

export function EditableTable<T extends object>({
  columns,
  writesEnabled = false,
  confirmWrite,
  rowKey,
  pagination,
  onChange,
  ...tableProps
}: EditableTableProps<T>): React.JSX.Element {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [editingKey, setEditingKey] = useState<React.Key>("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState<{
    record: T;
    values: Record<string, unknown>;
  } | null>(null);

  const canEdit = writesEnabled === true && confirmWrite != null;

  function recordKey(record: T): React.Key {
    if (typeof rowKey === "function") {
      return rowKey(record);
    }
    if (typeof rowKey === "string") {
      return String((record as Record<string, unknown>)[rowKey]);
    }
    return String((record as { key?: React.Key }).key ?? "");
  }

  function isEditing(record: T): boolean {
    return recordKey(record) === editingKey;
  }

  function isColumnEditable(column: EditableColumn<T>, record: T): boolean {
    if (column.editable === true) {
      return true;
    }
    if (typeof column.editable === "function") {
      return column.editable(record);
    }
    return false;
  }

  function formName(column: EditableColumn<T>): string | null {
    if (column.formItemName) {
      return column.formItemName;
    }
    if (typeof column.dataIndex === "string") {
      return column.dataIndex;
    }
    return null;
  }

  function valuesFromRecord(record: T): Record<string, unknown> {
    const values: Record<string, unknown> = {};
    for (const column of columns) {
      if (column.editable === false || column.editable == null) {
        if (typeof column.editable !== "function") {
          continue;
        }
      }
      const name = formName(column);
      if (!name) {
        continue;
      }
      const raw = (record as Record<string, unknown>)[name];
      values[name] = column.editor === "switch" ? asFlag(raw) : raw;
    }
    return values;
  }

  function edit(record: T): void {
    form.setFieldsValue(valuesFromRecord(record));
    setEditingKey(recordKey(record));
  }

  function cancel(): void {
    setEditingKey("");
    form.resetFields();
  }

  async function save(record: T): Promise<void> {
    if (!confirmWrite) {
      return;
    }
    try {
      const formValues = (await form.validateFields()) as Record<string, unknown>;
      const values = { ...valuesFromRecord(record), ...formValues };
      if (!hasChanges(valuesFromRecord(record), values)) {
        message.info("No changes to save.");
        return;
      }
      setPending({ record, values });
      setConfirmOpen(true);
    } catch {
      message.error("Fix the highlighted fields before saving.");
    }
  }

  const mergedColumns = (() => {
    const withEditors = columns.map((column) => {
      if (column.editable == null || column.editable === false) {
        return column;
      }
      const name = formName(column);
      return {
        ...column,
        onCell: (record: T) =>
          ({
            record,
            editing: canEdit && isEditing(record) && isColumnEditable(column, record),
            dataIndex: name ?? undefined,
            title: typeof column.title === "string" ? column.title : name,
            editor: column.editor ?? "text",
            editorProps: column.editorProps,
            required: column.required,
          }) as React.HTMLAttributes<HTMLTableCellElement>,
      };
    });
    if (!canEdit) {
      return withEditors;
    }
    return [
      ...withEditors,
      {
        title: "",
        key: "editable-actions",
        width: 88,
        fixed: "right" as const,
        render: (_: unknown, record: T) => {
          if (isEditing(record)) {
            return (
              <Space size={0}>
                <Tooltip title="Save">
                  <Button
                    aria-label="Save"
                    icon={<CheckOutlined />}
                    type="text"
                    onClick={() => {
                      void save(record);
                    }}
                  />
                </Tooltip>
                <Tooltip title="Cancel">
                  <Button
                    aria-label="Cancel"
                    icon={<CloseOutlined />}
                    type="text"
                    onClick={cancel}
                  />
                </Tooltip>
              </Space>
            );
          }
          const blocked = editingKey !== "";
          return (
            <Tooltip title={blocked ? "Finish editing the current row first." : "Edit"}>
              <Button
                aria-label="Edit"
                disabled={blocked}
                icon={<EditOutlined />}
                type="text"
                onClick={() => {
                  edit(record);
                }}
              />
            </Tooltip>
          );
        },
      },
    ];
  })();

  const mergedPagination = mergePagination(pagination, cancel);

  return (
    <Form form={form} component={false}>
      <Table<T>
        {...tableProps}
        columns={mergedColumns as TableProps<T>["columns"]}
        components={{ body: { cell: EditableCell } }}
        pagination={mergedPagination}
        rowKey={rowKey}
        onChange={(nextPagination, filters, sorter, extra) => {
          cancel();
          onChange?.(nextPagination, filters, sorter, extra);
        }}
      />
      {confirmWrite ? (
        <ConfirmWriteModal
          hideTrigger
          buttonLabel="Preview save"
          commitAction={confirmWrite.commitAction}
          open={confirmOpen}
          previewAction={() => {
            if (!pending) {
              return Promise.reject(new Error("Nothing to save."));
            }
            return confirmWrite.previewAction(pending.record, pending.values);
          }}
          successMessage={confirmWrite.successMessage}
          title={
            pending
              ? confirmWrite.title(pending.record, pending.values)
              : "Update field"
          }
          onDone={() => {
            setEditingKey("");
            form.resetFields();
            confirmWrite.onDone?.();
          }}
          onOpenChange={(open) => {
            setConfirmOpen(open);
            if (!open) {
              setPending(null);
            }
          }}
        />
      ) : null}
    </Form>
  );
}

function mergePagination(
  pagination: TablePaginationConfig | false | undefined,
  onPageChange: () => void,
): TablePaginationConfig | false | undefined {
  if (pagination === false || pagination == null) {
    return pagination;
  }
  return {
    ...pagination,
    onChange: (page, pageSize) => {
      onPageChange();
      pagination.onChange?.(page, pageSize);
    },
  };
}

function hasChanges(
  current: Record<string, unknown>,
  next: Record<string, unknown>,
): boolean {
  const keys = new Set([...Object.keys(current), ...Object.keys(next)]);
  for (const key of keys) {
    if (normalizeCompare(current[key]) !== normalizeCompare(next[key])) {
      return true;
    }
  }
  return false;
}

function normalizeCompare(value: unknown): string {
  if (typeof value === "boolean") {
    return value ? "1" : "0";
  }
  if (typeof value === "number") {
    return String(value);
  }
  return String(value ?? "").trim();
}

function asFlag(value: unknown): boolean {
  return value === true || value === 1 || value === "1" || value === "Y";
}
