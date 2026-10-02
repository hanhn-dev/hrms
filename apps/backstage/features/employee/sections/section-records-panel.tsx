"use client";

import { App, Button, Card, Modal, Select, Space, Typography } from "antd";
import Link from "next/link";
import { DataTable } from "@/shared/ui/data-table";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { tableSpecFor } from "@hrms/db/sections-registry";
import type {
  SectionFormField,
  SectionRecordRow,
} from "@/features/employee/sections/queries";
import {
  fieldsForTable,
  SectionRecordForm,
  type SectionFormValues,
} from "@/features/employee/sections/section-record-form";
import {
  commitDeleteSectionRecordAction,
  commitUpsertSectionRecordAction,
  previewDeleteSectionRecord,
  previewUpsertSectionRecord,
} from "@/features/employee/sections/mutations";
import { ConfirmWriteModal } from "@/shared/ui";
import { formatDate } from "@/shared/format-date";
import { sectionGridColumns } from "@/features/employee/sections/section-grid-columns";
import {
  SectionLookupIdButton,
  useSectionLookupModal,
} from "@/features/employee/sections/section-lookup-modal";

function formatCell(value: unknown): string {
  if (value == null || value === "") return "—";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return formatDate(value);
  }
  return String(value);
}

export function SectionRecordsPanel({
  employerId,
  employmentNumber,
  sectionId,
  label,
  fields,
  records,
  recordsScript,
  writesEnabled,
  tables,
}: {
  employerId: number;
  employmentNumber: string;
  sectionId: number;
  label: string;
  fields: SectionFormField[];
  records: SectionRecordRow[];
  recordsScript: string;
  writesEnabled: boolean;
  tables: string[];
}): React.JSX.Element {
  const router = useRouter();
  const { message } = App.useApp();
  const { openLookup, modal: lookupModal } = useSectionLookupModal();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<SectionRecordRow | null>(null);
  const [addTable, setAddTable] = useState(tables[0] ?? "");
  const [pendingValues, setPendingValues] = useState<SectionFormValues | null>(
    null,
  );
  const [confirmUpsertOpen, setConfirmUpsertOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SectionRecordRow | null>(
    null,
  );
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const formId = "section-record-form";
  const activeTable = editing?.liveTable ?? addTable;
  const formFields = useMemo(
    () => fieldsForTable(fields, activeTable),
    [fields, activeTable],
  );

  const displayColumns = useMemo(() => {
    const planned = sectionGridColumns(fields.slice(0, 6), records);
    return planned.map((column) => ({
      title: column.title,
      key: `${column.kind}:${column.displayText}`,
      ellipsis: column.kind !== "lookup-id",
      width: column.kind === "lookup-id" ? 110 : undefined,
      render: (_: unknown, row: SectionRecordRow) => {
        const lookup = row.lookups[column.displayText];
        if (column.kind === "lookup-id") {
          if (!lookup) return "—";
          return (
            <SectionLookupIdButton
              id={lookup.id}
              onClick={() => openLookup(lookup)}
            />
          );
        }
        if (column.kind === "lookup-name") {
          if (lookup) return lookup.label ?? "—";
          return formatCell(row.values[column.displayText]);
        }
        return formatCell(row.values[column.displayText]);
      },
    }));
  }, [fields, openLookup, records]);

  function openAdd(): void {
    setEditing(null);
    setPendingValues(null);
    setEditorOpen(true);
  }

  function openEdit(row: SectionRecordRow): void {
    setEditing(row);
    setPendingValues(null);
    setEditorOpen(true);
  }

  return (
    <>
      <Card title={`${label} records`}>
        <Space style={{ marginBottom: 12 }} wrap>
          <Link
            href={`/employers/${employerId}/employees/${encodeURIComponent(employmentNumber)}/sections`}
          >
            ← Sections
          </Link>
          <Typography.Text type="secondary">{label}</Typography.Text>
          {tables.length > 1 ? (
            <Select
              size="small"
              style={{ minWidth: 220 }}
              value={addTable}
              onChange={setAddTable}
              options={tables.map((t) => ({ value: t, label: t }))}
              disabled={editing != null}
            />
          ) : null}
          <Button
            type="primary"
            disabled={!writesEnabled || formFields.length === 0}
            title={
              writesEnabled
                ? undefined
                : "Writes are disabled for this environment."
            }
            onClick={openAdd}
          >
            Add record
          </Button>
        </Space>

        <DataTable
          queryScript={recordsScript}
          rowKey="recordKey"
          size="small"
          dataSource={records}
          pagination={{ pageSize: 20 }}
          columns={[
            ...displayColumns,
            {
              title: "Table",
              dataIndex: "liveTable",
              width: 180,
              ellipsis: true,
            },
            {
              title: "Actions",
              key: "actions",
              width: 180,
              render: (_: unknown, row: SectionRecordRow) => (
                <Space>
                  <Button
                    size="small"
                    disabled={!writesEnabled}
                    onClick={() => openEdit(row)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="small"
                    danger
                    disabled={
                      !writesEnabled ||
                      tableSpecFor(sectionId, row.liveTable)?.softDelete
                        .kind === "none"
                    }
                    title={
                      tableSpecFor(sectionId, row.liveTable)?.softDelete
                        .kind === "none"
                        ? "Delete is not supported for this table."
                        : undefined
                    }
                    onClick={() => {
                      setDeleteTarget(row);
                      setConfirmDeleteOpen(true);
                    }}
                  >
                    Delete
                  </Button>
                </Space>
              ),
            },
          ]}
        />
      </Card>

      <Modal
        title={editing ? `Edit ${label}` : `Add ${label}`}
        open={editorOpen}
        onCancel={() => {
          setEditorOpen(false);
          setEditing(null);
        }}
        width={720}
        destroyOnHidden
        footer={[
          <Button
            key="cancel"
            onClick={() => {
              setEditorOpen(false);
              setEditing(null);
            }}
          >
            Cancel
          </Button>,
          <Button
            key="save"
            type="primary"
            htmlType="submit"
            form={formId}
            disabled={!writesEnabled || formFields.length === 0}
          >
            Review & save
          </Button>,
        ]}
      >
        {formFields.length === 0 ? (
          <Typography.Text type="danger">
            No mapped non-Segment fields for table {activeTable}.
          </Typography.Text>
        ) : (
          <SectionRecordForm
            formId={formId}
            fields={formFields}
            initialValues={editing?.values ?? null}
            onSubmit={(values) => {
              setPendingValues(values);
              setConfirmUpsertOpen(true);
            }}
          />
        )}
      </Modal>

      <ConfirmWriteModal
        title={editing ? "Confirm update" : "Confirm insert"}
        buttonLabel="Confirm"
        hideTrigger
        open={confirmUpsertOpen}
        onOpenChange={setConfirmUpsertOpen}
        disabled={!writesEnabled || pendingValues == null}
        previewAction={async () => {
          if (!pendingValues) throw new Error("No values to save.");
          return previewUpsertSectionRecord({
            employerId,
            employmentNumber,
            sectionId,
            liveTable: activeTable,
            entityKey: editing?.entityKey ?? null,
            values: pendingValues,
          });
        }}
        commitAction={commitUpsertSectionRecordAction}
        successMessage="Section record saved."
        onDone={() => {
          setEditorOpen(false);
          setEditing(null);
          setPendingValues(null);
          message.success("Section record saved.");
          router.refresh();
        }}
      />

      <ConfirmWriteModal
        title="Confirm soft-delete"
        buttonLabel="Confirm delete"
        hideTrigger
        open={confirmDeleteOpen}
        onOpenChange={(open) => {
          setConfirmDeleteOpen(open);
          if (!open) setDeleteTarget(null);
        }}
        disabled={!writesEnabled || deleteTarget == null}
        previewAction={async () => {
          if (!deleteTarget) throw new Error("No record selected.");
          return previewDeleteSectionRecord({
            employerId,
            employmentNumber,
            sectionId,
            liveTable: deleteTarget.liveTable,
            entityKey: deleteTarget.entityKey,
          });
        }}
        commitAction={commitDeleteSectionRecordAction}
        successMessage="Section record deleted."
        onDone={() => {
          setDeleteTarget(null);
          message.success("Section record soft-deleted.");
          router.refresh();
        }}
      />
      {lookupModal}
    </>
  );
}
