"use client";

import { App, Button, Card, Space, Tag } from "antd";
import { DataTable } from "@/shared/ui/data-table";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  PendingSectionRow,
  SectionFormField,
} from "@/features/employee/sections/queries";
import { formatDate } from "@/shared/format-date";
import { sectionGridColumns } from "@/features/employee/sections/section-grid-columns";
import {
  SectionLookupIdButton,
  useSectionLookupModal,
} from "@/features/employee/sections/section-lookup-modal";
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

export function SectionPendingCard({
  employerId,
  fields,
  pending,
  pendingScript,
  writesEnabled,
}: {
  employerId: number;
  fields: SectionFormField[];
  pending: PendingSectionRow[];
  pendingScript: string;
  writesEnabled: boolean;
}): React.JSX.Element {
  const router = useRouter();
  const { message } = App.useApp();
  const { openLookup, modal: lookupModal } = useSectionLookupModal();
  const [decideStatus, setDecideStatus] = useState<DecideStatus | null>(null);
  const [decideDetail, setDecideDetail] = useState<ChangeRequestDetail | null>(null);
  const [decideScript, setDecideScript] = useState("");
  const [decideApprovers, setDecideApprovers] = useState<ConfiguredApproverGroup[]>([]);
  const [decideLoading, setDecideLoading] = useState<{
    changeRequestId: number;
    status: DecideStatus;
  } | null>(null);
  const changeRequestView = useChangeRequestView(employerId);

  const displayColumns = useMemo(() => {
    const planned = sectionGridColumns(fields.slice(0, 6), pending);
    return planned.map((column) => ({
      title: column.title,
      key: `${column.kind}:${column.displayText}`,
      ellipsis: column.kind !== "lookup-id",
      width: column.kind === "lookup-id" ? 110 : undefined,
      render: (_: unknown, row: PendingSectionRow) => {
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
  }, [fields, openLookup, pending]);

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

  return (
    <>
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
      {lookupModal}
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
    </>
  );
}
