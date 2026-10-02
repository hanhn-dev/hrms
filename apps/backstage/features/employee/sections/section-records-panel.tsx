"use client";

import { App, Button, Card, Modal, Select, Space, Tag, Typography } from "antd";
import Link from "next/link";
import { DataTable } from "@/shared/ui/data-table";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { tableSpecFor } from "@hrms/db/sections-registry";
import type {
  PendingSectionRow,
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
import { getChangeRequestDetail } from "@/features/employer/workflows/change-request-actions";
import { ChangeRequestDecideModal } from "@/features/employer/workflows/change-request-decide-modal";
import {
  ChangeRequestIdButton,
  useChangeRequestView,
} from "@/features/employer/workflows/change-request-view";
import type {
  ChangeRequestDetail,
  ConfiguredApproverGroup,
} from "@/features/employer/workflows/queries";

type DecideStatus = "Approved" | "Rejected";

const PENDING_STATUS_LABEL: Record<PendingSectionRow["status"], string> = {
  ADDED: "Added",
  UPDATED: "Updated",
  DELETED: "Deleted",
};

const PENDING_STATUS_COLOR: Record<PendingSectionRow["status"], string> = {
  ADDED: "green",
  UPDATED: "blue",
  DELETED: "red",
};

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
  pending,
  pendingScript,
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
  pending: PendingSectionRow[];
  pendingScript: string;
  recordsScript: string;
  writesEnabled: boolean;
  tables: string[];
}): React.JSX.Element {
  const router = useRouter();
  const { message } = App.useApp();
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
  const [decideStatus, setDecideStatus] = useState<DecideStatus | null>(null);
  const [decideDetail, setDecideDetail] = useState<ChangeRequestDetail | null>(null);
  const [decideScript, setDecideScript] = useState("");
  const [decideApprovers, setDecideApprovers] = useState<ConfiguredApproverGroup[]>([]);
  const [decideLoading, setDecideLoading] = useState<{
    changeRequestId: number;
    status: DecideStatus;
  } | null>(null);
  const changeRequestView = useChangeRequestView(employerId);

  const formId = "section-record-form";
  const activeTable = editing?.liveTable ?? addTable;
  const formFields = useMemo(
    () => fieldsForTable(fields, activeTable),
    [fields, activeTable],
  );

  const displayColumns = useMemo(() => {
    const preferred = fields.slice(0, 6);
    return preferred.map((field) => ({
      title: field.displayText,
      key: field.displayText,
      ellipsis: true,
      render: (
        _: unknown,
        row: { values: Record<string, string | number | boolean | null> },
      ) => formatCell(row.values[field.displayText]),
    }));
  }, [fields]);

  const pendingColumns = useMemo(
    () => [
      ...displayColumns,
      {
        title: "Status",
        dataIndex: "status",
        width: 110,
        render: (status: PendingSectionRow["status"]) => (
          <Tag color={PENDING_STATUS_COLOR[status]}>
            {PENDING_STATUS_LABEL[status]}
          </Tag>
        ),
      },
      {
        title: "Requested",
        dataIndex: "requestedAt",
        width: 190,
        render: (value: string | null) => formatDate(value),
      },
      {
        title: "Change request",
        dataIndex: "changeRequestId",
        width: 140,
        render: (changeRequestId: number) => (
          <ChangeRequestIdButton
            changeRequestId={changeRequestId}
            onOpen={(id) => {
              setDecideStatus(null);
              void changeRequestView.openView(id);
            }}
          />
        ),
      },
      {
        title: "Actions",
        key: "pendingActions",
        width: 180,
        render: (_: unknown, row: PendingSectionRow) => (
          <Space>
            <Button
              disabled={!writesEnabled}
              loading={
                decideLoading?.changeRequestId === row.changeRequestId &&
                decideLoading.status === "Approved"
              }
              size="small"
              title={
                writesEnabled
                  ? undefined
                  : "Writes are disabled for this environment."
              }
              type="primary"
              onClick={(event) => {
                event.stopPropagation();
                void openDecide(row.changeRequestId, "Approved");
              }}
            >
              Approve
            </Button>
            <Button
              danger
              disabled={!writesEnabled}
              loading={
                decideLoading?.changeRequestId === row.changeRequestId &&
                decideLoading.status === "Rejected"
              }
              size="small"
              title={
                writesEnabled
                  ? undefined
                  : "Writes are disabled for this environment."
              }
              onClick={(event) => {
                event.stopPropagation();
                void openDecide(row.changeRequestId, "Rejected");
              }}
            >
              Reject
            </Button>
          </Space>
        ),
      },
    ],
    [changeRequestView.openView, decideLoading, displayColumns, writesEnabled],
  );

  async function openDecide(
    changeRequestId: number,
    status: DecideStatus,
  ): Promise<void> {
    setDecideLoading({ changeRequestId, status });
    try {
      const result = await getChangeRequestDetail(employerId, changeRequestId);
      setDecideDetail(result.detail);
      setDecideScript(result.queryScript);
      setDecideApprovers(result.approvers);
      setDecideStatus(status);
    } catch (error) {
      message.error(
        error instanceof Error
          ? error.message
          : "Failed to load change request.",
      );
    } finally {
      setDecideLoading(null);
    }
  }

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

      <Card className="mt-4" title="Pending approval">
        <DataTable<PendingSectionRow>
          queryScript={pendingScript}
          rowKey="recordKey"
          size="small"
          dataSource={pending}
          pagination={{ pageSize: 20 }}
          locale={{ emptyText: "No changes pending approval." }}
          columns={pendingColumns}
        />
      </Card>

      {changeRequestView.modal}

      <ChangeRequestDecideModal
        approvers={decideApprovers}
        detail={decideDetail}
        employerId={employerId}
        open={decideStatus != null && decideDetail != null}
        queryScript={decideScript}
        status={decideStatus ?? "Approved"}
        writesEnabled={writesEnabled}
        onClose={() => {
          setDecideStatus(null);
        }}
        onDone={() => {
          setDecideStatus(null);
          setDecideDetail(null);
          router.refresh();
        }}
      />

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
    </>
  );
}
