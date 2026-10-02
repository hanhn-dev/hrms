"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Card,
  Drawer,
  Empty,
  Form,
  Input,
  InputNumber,
  Radio,
  Space,
  Switch,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import { DataTable } from "@/shared/ui/data-table";
import type { MasterDataColumn, MasterDataEntry, MasterDataLookupOption, MasterDataRow } from "@hrms/db";
import {
  commitMasterDataChange,
  previewMasterDataChange,
} from "@/features/employer/master-data/mutations";
import {
  CATALOG_GROUPS,
  filterCatalogItems,
  filterDataRows,
} from "@/features/employer/master-data/catalog-view";
import { ConfirmWriteModal, HighlightMatch, SearchSelect } from "@/shared/ui";

type EditorState =
  | { mode: "insert" }
  | { mode: "update"; id: number };

type ConfirmState = {
  mode: "insert" | "update" | "delete";
  id: number | null;
  values: Record<string, string | number | boolean | null>;
  title: string;
  successMessage: string;
};

function rowId(entry: MasterDataEntry, row: MasterDataRow): number | null {
  const value = row[entry.idColumn];
  return typeof value === "number" ? value : null;
}

function statusText(column: MasterDataColumn, value: MasterDataRow[string]): string {
  if (column.kind === "bit") {
    if (value === true) {
      return "Active";
    }
    if (value === false) {
      return "Inactive";
    }
    return "";
  }
  if (column.kind === "yn") {
    if (value === "Y") {
      return "Active";
    }
    if (value === "N") {
      return "Inactive";
    }
  }
  return "";
}

function lookupLabel(
  column: MasterDataColumn,
  value: MasterDataRow[string],
  lookups: Record<string, MasterDataLookupOption[]>,
): string {
  if (value == null || !column.lookupKey) {
    return "";
  }
  const id = typeof value === "number" ? value : Number(value);
  const match = lookups[column.lookupKey]?.find((option) => option.id === id);
  return match?.label ?? String(value);
}

function initialValues(entry: MasterDataEntry, row: MasterDataRow | null): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  if (entry.idMode === "manual" && !row) {
    values[entry.idColumn] = null;
  }
  for (const column of entry.columns) {
    if (row) {
      values[column.name] = row[column.name] ?? null;
      continue;
    }
    if (column.kind === "bit") {
      values[column.name] = true;
    } else if (column.kind === "yn") {
      values[column.name] = "Y";
    } else {
      values[column.name] = null;
    }
  }
  return values;
}

export function MasterDataPanel({
  employerId,
  catalog,
  selected,
  rows,
  lookups,
  writesEnabled,
  queryScript,
}: {
  employerId: number;
  catalog: MasterDataEntry[];
  selected: MasterDataEntry | null;
  rows: MasterDataRow[];
  lookups: Record<string, MasterDataLookupOption[]>;
  writesEnabled: boolean;
  queryScript: string;
}): React.JSX.Element {
  const router = useRouter();
  const [catalogQuery, setCatalogQuery] = useState("");
  const [rowQuery, setRowQuery] = useState("");
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const visibleCatalog = filterCatalogItems(catalog, catalogQuery);
  const visibleRows = filterDataRows(rows, rowQuery);
  const editingRow =
    editor?.mode === "update" && selected
      ? rows.find((row) => rowId(selected, row) === editor.id) ?? null
      : null;

  function openConfirm(next: ConfirmState): void {
    setConfirm(next);
  }

  return (
    <div className="flex min-h-[32rem] gap-4">
      <Card className="w-72 shrink-0" title="Lists">
        <Input.Search
          allowClear
          aria-label="Search master lists"
          className="mb-3"
          placeholder="Search lists"
          value={catalogQuery}
          onChange={(event) => {
            setCatalogQuery(event.target.value);
          }}
        />
        {visibleCatalog.length === 0 ? (
          <Empty description="No lists match." />
        ) : (
          <div className="flex flex-col gap-3">
            {CATALOG_GROUPS.map((group) => {
              const items = visibleCatalog.filter((item) => item.group === group.id);
              if (items.length === 0) {
                return null;
              }
              return (
                <section key={group.id}>
                  <Typography.Text type="secondary" className="text-xs uppercase">
                    {group.label}
                  </Typography.Text>
                  <div className="mt-1 flex flex-col">
                    {items.map((item) => {
                      const active = item.key === selected?.key;
                      return (
                        <Button
                          key={item.key}
                          className="justify-start px-2"
                          type={active ? "primary" : "text"}
                          onClick={() => {
                            setRowQuery("");
                            router.push(`/employers/${employerId}/master-data?list=${item.key}`);
                          }}
                        >
                          <HighlightMatch query={catalogQuery} text={item.label} />
                        </Button>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </Card>
      <Card
        className="min-w-0 flex-1"
        title={selected?.label ?? "Master data"}
        extra={
          selected ? (
            <Tooltip title={writesEnabled ? undefined : "Writes are disabled."}>
              <Button
                disabled={!writesEnabled}
                type="primary"
                onClick={() => {
                  setEditor({ mode: "insert" });
                }}
              >
                Add
              </Button>
            </Tooltip>
          ) : null
        }
      >
        {selected ? (
          <>
            <Input.Search
              allowClear
              aria-label={`Search ${selected.label}`}
              className="mb-3 max-w-md"
              placeholder={`Search ${selected.label.toLowerCase()}`}
              value={rowQuery}
              onChange={(event) => {
                setRowQuery(event.target.value);
              }}
            />
            <DataTable<MasterDataRow>
              queryScript={queryScript}
              rowKey={(row) => String(rowId(selected, row) ?? row[selected.idColumn])}
              dataSource={visibleRows}
              pagination={{ pageSize: 20, showSizeChanger: true }}
              scroll={{ x: true }}
              locale={{ emptyText: rowQuery.trim() ? "No rows match." : "No rows." }}
              columns={[
                {
                  title: "Id",
                  dataIndex: selected.idColumn,
                  width: 90,
                },
                ...selected.columns.map((column) => ({
                  title: column.label,
                  dataIndex: column.name,
                  render: (value: MasterDataRow[string]) => {
                    if (column.kind === "bit" || column.kind === "yn") {
                      const text = statusText(column, value);
                      if (!text) {
                        return null;
                      }
                      return <Tag color={text === "Active" ? "green" : "default"}>{text}</Tag>;
                    }
                    const text = column.lookupKey
                      ? lookupLabel(column, value, lookups)
                      : value == null
                        ? ""
                        : String(value);
                    if (!text) {
                      return null;
                    }
                    return <HighlightMatch query={rowQuery} text={text} />;
                  },
                })),
                {
                  title: "",
                  key: "actions",
                  width: 160,
                  render: (_value: unknown, row: MasterDataRow) => {
                    const id = rowId(selected, row);
                    return (
                      <Space>
                        <Button
                          disabled={!writesEnabled || id == null}
                          size="small"
                          onClick={() => {
                            if (id != null) {
                              setEditor({ mode: "update", id });
                            }
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          danger
                          disabled={!writesEnabled || id == null}
                          size="small"
                          onClick={() => {
                            if (id == null) {
                              return;
                            }
                            openConfirm({
                              mode: "delete",
                              id,
                              values: {},
                              title: `Delete ${selected.label}`,
                              successMessage: `${selected.label} deleted.`,
                            });
                          }}
                        >
                          Delete
                        </Button>
                      </Space>
                    );
                  },
                },
              ]}
            />
          </>
        ) : (
          <Empty description="That list is not in this database." />
        )}
      </Card>
      {selected && editor ? (
        <MasterDataDrawer
          entry={selected}
          lookups={lookups}
          mode={editor.mode}
          open
          row={editingRow}
          writesEnabled={writesEnabled}
          onClose={() => {
            setEditor(null);
          }}
          onSubmit={(values) => {
            const id = editor.mode === "update" ? editor.id : null;
            openConfirm({
              mode: editor.mode,
              id,
              values,
              title: editor.mode === "insert" ? `Add ${selected.label}` : `Update ${selected.label}`,
              successMessage:
                editor.mode === "insert"
                  ? `${selected.label} added.`
                  : `${selected.label} updated.`,
            });
            setEditor(null);
          }}
        />
      ) : null}
      {selected && confirm ? (
        <ConfirmWriteModal
          hideTrigger
          buttonLabel="Preview"
          commitAction={commitMasterDataChange}
          open
          previewAction={() =>
            previewMasterDataChange({
              employerId,
              key: selected.key,
              mode: confirm.mode,
              id: confirm.id,
              values: confirm.values,
            })
          }
          successMessage={confirm.successMessage}
          title={confirm.title}
          onDone={() => {
            router.refresh();
          }}
          onOpenChange={(open) => {
            if (!open) {
              setConfirm(null);
            }
          }}
        />
      ) : null}
    </div>
  );
}

function MasterDataDrawer({
  entry,
  mode,
  row,
  lookups,
  writesEnabled,
  open,
  onClose,
  onSubmit,
}: {
  entry: MasterDataEntry;
  mode: "insert" | "update";
  row: MasterDataRow | null;
  lookups: Record<string, MasterDataLookupOption[]>;
  writesEnabled: boolean;
  open: boolean;
  onClose: () => void;
  onSubmit: (values: Record<string, string | number | boolean | null>) => void;
}): React.JSX.Element {
  const [form] = Form.useForm<Record<string, string | number | boolean | null>>();
  const columns: MasterDataColumn[] =
    mode === "insert" && entry.idMode === "manual"
      ? [{ name: entry.idColumn, label: "Id", kind: "int", required: true }, ...entry.columns]
      : entry.columns;

  return (
    <Drawer
      destroyOnHidden
      open={open}
      title={mode === "insert" ? `Add ${entry.label}` : `Edit ${entry.label}`}
      onClose={onClose}
      extra={
        <Button
          disabled={!writesEnabled}
          type="primary"
          onClick={() => {
            void form.validateFields().then((values) => {
              onSubmit(values);
            });
          }}
        >
          Preview
        </Button>
      }
    >
      <Form
        form={form}
        initialValues={initialValues(entry, mode === "update" ? row : null)}
        layout="vertical"
      >
        {columns.map((column) => (
          <Form.Item
            key={column.name}
            label={column.label}
            name={column.name}
            rules={column.required ? [{ required: true, message: `${column.label} is required.` }] : undefined}
            valuePropName={column.kind === "bit" ? "checked" : "value"}
          >
            {column.lookupKey ? (
              <SearchSelect
                allowClear
                options={(lookups[column.lookupKey] ?? []).map((option) => ({
                  value: option.id,
                  label: option.label,
                }))}
                placeholder={`Select ${column.label.toLowerCase()}`}
              />
            ) : column.kind === "bit" ? (
              <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
            ) : column.kind === "yn" ? (
              <Radio.Group>
                <Radio value="Y">Active</Radio>
                <Radio value="N">Inactive</Radio>
              </Radio.Group>
            ) : column.kind === "int" ? (
              <InputNumber className="w-full" />
            ) : (
              <Input maxLength={column.maxLength} />
            )}
          </Form.Item>
        ))}
      </Form>
    </Drawer>
  );
}
