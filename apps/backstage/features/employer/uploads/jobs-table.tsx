"use client";

import { Input, Select, Table, Tag } from "antd";
import { useRouter } from "next/navigation";
import {
  UPLOAD_STATUSES,
  uploadsHref,
} from "@/features/employer/uploads/uploads-source";
import type { UploadListItem, UploadTypeKey } from "@/features/employer/uploads/queries";
import { formatDate } from "@/shared/format-date";
import { EntityLink } from "@/shared/entity-link";
import { UPLOAD_TYPE_LABELS } from "@hrms/db/uploads";

export function JobsTable({
  employerId,
  jobs,
  type,
  status,
  uploadId,
}: {
  employerId: number;
  jobs: UploadListItem[];
  type: UploadTypeKey | null;
  status: string | null;
  uploadId: number | null;
}): React.JSX.Element {
  const router = useRouter();

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Select
          allowClear
          className="min-w-40"
          placeholder="Status"
          value={status ?? undefined}
          options={UPLOAD_STATUSES.map((value) => ({ label: value, value }))}
          onChange={(next: string | undefined) => {
            router.push(
              uploadsHref(employerId, {
                type,
                status: next ?? null,
                uploadId,
              }),
            );
          }}
        />
        <Input.Search
          allowClear
          className="max-w-xs"
          defaultValue={uploadId ? String(uploadId) : ""}
          placeholder="UploadID"
          onSearch={(value) => {
            const parsed = Number(value.trim());
            router.push(
              uploadsHref(employerId, {
                type,
                status,
                uploadId: Number.isInteger(parsed) && parsed > 0 ? parsed : null,
              }),
            );
          }}
        />
      </div>
      <Table
        rowKey="uploadId"
        dataSource={jobs}
        size="small"
        scroll={{ x: "max-content" }}
        rowClassName={(row) => (row.expired ? "upload-row-expired" : "")}
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          showTotal: (total) => `${total} uploads`,
        }}
        locale={{ emptyText: "No bulk uploads match the current filters." }}
        columns={[
          {
            title: "UploadID",
            dataIndex: "uploadId",
            width: 110,
            render: (id: number) => (
              <EntityLink employerId={employerId} entity={{ kind: "upload", uploadId: id }}>
                {id}
              </EntityLink>
            ),
          },
          {
            title: "Type",
            dataIndex: "type",
            width: 200,
            render: (_: unknown, row: UploadListItem) =>
              row.type ? UPLOAD_TYPE_LABELS[row.type] : (row.uploadType ?? "—"),
          },
          {
            title: "Status",
            dataIndex: "status",
            width: 140,
            render: (value: string | null, row: UploadListItem) => (
              <StatusTag status={value} stuck={row.stuck} />
            ),
          },
          { title: "Country", dataIndex: "countryName", width: 140, render: dash },
          { title: "Sections", dataIndex: "sectionCount", width: 100 },
          { title: "Rows", dataIndex: "total", width: 80 },
          { title: "Valid", dataIndex: "valid", width: 80 },
          { title: "Invalid", dataIndex: "invalid", width: 90 },
          { title: "Processed", dataIndex: "processed", width: 110 },
          { title: "Unprocessed", dataIndex: "unprocessed", width: 120 },
          {
            title: "Created",
            dataIndex: "createdDate",
            width: 180,
            render: (value: string | null, row: UploadListItem) =>
              value ? `${formatDate(value)}${row.createdByName ? ` · ${row.createdByName}` : ""}` : "—",
          },
          {
            title: "Error",
            dataIndex: "errorMessage",
            width: 240,
            ellipsis: true,
            render: dash,
          },
        ]}
      />
    </>
  );
}

export function StatusTag({
  status,
  stuck,
}: {
  status: string | null;
  stuck?: boolean;
}): React.JSX.Element {
  if (stuck) {
    return <Tag color="orange">Stuck · {status}</Tag>;
  }
  if (status === "Failed") {
    return <Tag color="red">{status}</Tag>;
  }
  if (status === "Processed") {
    return <Tag color="green">{status}</Tag>;
  }
  if (status === "Validated") {
    return <Tag color="blue">{status}</Tag>;
  }
  return <Tag>{status ?? "—"}</Tag>;
}

function dash(value: string | null | undefined): string {
  return value?.trim() ? value : "—";
}
