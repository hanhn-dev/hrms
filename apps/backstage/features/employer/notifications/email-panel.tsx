"use client";

import { Button, DatePicker, Input, Select, Tag, Tooltip } from "antd";
import { DataTable } from "@/shared/ui/data-table";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  notificationsHref,
  type NotificationsQuery,
} from "@/features/employer/notifications/notifications-source";
import type {
  EmailNotificationList,
  EmailNotificationRow,
} from "@/features/employer/notifications/queries";
import { formatDate } from "@/shared/format-date";
import {
  EMAIL_MODULES,
  EMAIL_MODULE_LABELS,
  EMAIL_STATUSES,
  type EmailStatus,
} from "@hrms/db/notifications";

dayjs.extend(utc);

const STATUS_COLOR: Record<EmailStatus, string> = {
  New: "blue",
  Pending: "orange",
  Failed: "red",
  Completed: "green",
  Other: "default",
};

function text(value: string | null | undefined): string {
  return value?.trim() || "—";
}

function CreatedPicker({
  value,
  placeholder,
  onChange,
}: {
  value: string | null;
  placeholder: string;
  onChange: (value: string | null) => void;
}): React.JSX.Element {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Input
        readOnly
        className="w-52"
        placeholder={placeholder}
        value={value ? formatDate(value, "DD-MMM-YYYY HH:mm") : ""}
      />
    );
  }

  return (
    <DatePicker
      showTime={{ format: "HH:mm" }}
      format="DD-MMM-YYYY HH:mm"
      placeholder={placeholder}
      value={value ? dayjs.utc(value) : null}
      onChange={(next) => {
        onChange(next ? next.toDate().toISOString() : null);
      }}
    />
  );
}

export function EmailPanel({
  employerId,
  query,
  appliedFrom,
  appliedTo,
  usingDefaultWindow,
  result,
  queryScript,
}: {
  employerId: number;
  query: NotificationsQuery;
  appliedFrom: string | null;
  appliedTo: string | null;
  usingDefaultWindow: boolean;
  result: EmailNotificationList;
  queryScript: string;
}): React.JSX.Element {
  const router = useRouter();

  const push = (patch: Partial<NotificationsQuery>): void => {
    router.push(
      notificationsHref(employerId, {
        ...query,
        ...patch,
        page: patch.page ?? 1,
      }),
    );
  };

  const boundFrom = query.rangeAll ? null : (query.from ?? appliedFrom);
  const boundTo = query.rangeAll ? null : (query.to ?? appliedTo);

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {result.counts
          .filter((item) => item.count > 0)
          .map((item) => (
            <Tag
              key={item.status}
              className="cursor-pointer"
              color={query.status === item.status ? STATUS_COLOR[item.status] : undefined}
              onClick={() => {
                push({
                  status: query.status === item.status ? null : item.status,
                });
              }}
            >
              {item.status} {item.count}
            </Tag>
          ))}
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Select
          allowClear
          className="min-w-52"
          placeholder="Module"
          value={query.module ?? undefined}
          options={EMAIL_MODULES.map((key) => ({
            label: EMAIL_MODULE_LABELS[key],
            value: key,
          }))}
          onChange={(next: NotificationsQuery["module"]) => {
            push({ module: next ?? null });
          }}
        />
        <Select
          allowClear
          className="min-w-40"
          placeholder="Status"
          value={query.status ?? undefined}
          options={EMAIL_STATUSES.map((status) => ({
            label: status,
            value: status,
          }))}
          onChange={(next: EmailStatus | undefined) => {
            push({ status: next ?? null });
          }}
        />
        <CreatedPicker
          placeholder="Created from"
          value={appliedFrom}
          onChange={(from) => {
            push({
              from,
              to: boundTo,
              rangeAll: !from && !boundTo,
            });
          }}
        />
        <CreatedPicker
          placeholder="Created to"
          value={appliedTo}
          onChange={(to) => {
            push({
              from: boundFrom,
              to,
              rangeAll: !boundFrom && !to,
            });
          }}
        />
        <Input.Search
          allowClear
          className="max-w-xs"
          key={query.template ?? ""}
          defaultValue={query.template ?? ""}
          placeholder="Template"
          onSearch={(value) => {
            push({ template: value.trim() || null });
          }}
        />
        <Input.Search
          allowClear
          className="max-w-40"
          key={query.transId ?? "trans"}
          defaultValue={query.transId ? String(query.transId) : ""}
          placeholder="Trans id"
          onSearch={(value) => {
            const parsed = Number(value.trim());
            push({
              transId: Number.isInteger(parsed) && parsed > 0 ? parsed : null,
            });
          }}
        />
        <Button
          onClick={() => {
            push({
              module: null,
              status: null,
              template: null,
              transId: null,
              from: null,
              to: null,
              rangeAll: true,
            });
          }}
        >
          Reset
        </Button>
        <span className="text-sm text-slate-500">
          {usingDefaultWindow
            ? "Showing the last 12 hours."
            : query.rangeAll
              ? "Showing all dates."
              : "Showing the selected created range."}
        </span>
      </div>
      <DataTable<EmailNotificationRow>
        queryScript={queryScript}
        rowKey={(row) => `${row.module}-${row.notificationId}`}
        dataSource={result.rows}
        size="small"
        scroll={{ x: "max-content" }}
        locale={{ emptyText: "No email notifications match the current filters." }}
        pagination={{
          current: result.page,
          pageSize: result.pageSize,
          total: result.totalCount,
          showSizeChanger: false,
          showTotal: (total) => `${total} notifications`,
          onChange: (next) => {
            push({ page: next });
          },
        }}
        columns={[
          { title: "Module", dataIndex: "moduleLabel" },
          { title: "Template", dataIndex: "templateName" },
          { title: "Trans id", dataIndex: "transId" },
          {
            title: "Status",
            dataIndex: "status",
            render: (_value, row) => (
              <Tooltip
                title={row.rawStatus !== row.status ? row.rawStatus : undefined}
              >
                <Tag color={STATUS_COLOR[row.status]}>{row.status}</Tag>
              </Tooltip>
            ),
          },
          {
            title: "Created",
            dataIndex: "createdDate",
            render: (value: string | null) => formatDate(value),
          },
          {
            title: "Attempts",
            dataIndex: "attemptsMade",
            render: (value: number | null) => (value == null ? "—" : value),
          },
          {
            title: "Fetched",
            dataIndex: "isFetched",
            render: (value: boolean) => (value ? "Yes" : "No"),
          },
          { title: "Action", dataIndex: "actionName", render: text },
          { title: "Error", dataIndex: "errorDetails", render: text },
          { title: "Action by", dataIndex: "actionByName", render: text },
          {
            title: "Request owner",
            dataIndex: "requestOwnerName",
            render: text,
          },
        ]}
      />
    </>
  );
}
