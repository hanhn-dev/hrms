"use client";

import { Alert, Button, Card, DatePicker, Input, Select, Tag } from "antd";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";
import {
  emailTriggersHref,
  notificationsDrilldownHref,
  type EmailTriggersQuery,
} from "@/features/employer/email-triggers/email-triggers-source";
import type { EmailTriggerSummary } from "@/features/employer/email-triggers/queries";
import { formatDate } from "@/shared/format-date";
import { TableCompareButton } from "@/shared/ui/data-table-compare-button";
import { TableSqlButton } from "@/shared/ui/data-table-sql-button";
import {
  EMAIL_MODULES,
  EMAIL_MODULE_LABELS,
  type EmailStatus,
} from "@hrms/db/notifications";
import {
  DELIVERY_STATUSES,
  type DeliveryStatus,
} from "@hrms/db/email-triggers";

dayjs.extend(utc);

const TRIGGER_COLOR: Record<EmailStatus, string> = {
  New: "blue",
  Pending: "orange",
  Failed: "red",
  Completed: "green",
  "Under Review": "gold",
  Other: "default",
};

const DELIVERY_COLOR: Record<DeliveryStatus, string> = {
  Sent: "green",
  Queued: "orange",
  "Not Queued": "default",
  Poisoned: "red",
};

function CreatedPicker({
  value,
  placeholder,
  onChange,
}: {
  value: string | null;
  placeholder: string;
  onChange: (value: string | null) => void;
}): React.JSX.Element {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

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

export function EmailTriggersPanel({
  employerId,
  query,
  appliedFrom,
  appliedTo,
  usingDefaultWindow,
  summary,
  queryScript,
}: {
  employerId: number;
  query: EmailTriggersQuery;
  appliedFrom: string | null;
  appliedTo: string | null;
  usingDefaultWindow: boolean;
  summary: EmailTriggerSummary;
  queryScript: string;
}): React.JSX.Element {
  const router = useRouter();

  const push = (patch: Partial<EmailTriggersQuery>): void => {
    router.push(
      emailTriggersHref(employerId, {
        ...query,
        ...patch,
      }),
    );
  };

  const boundFrom = query.rangeAll ? null : (query.from ?? appliedFrom);
  const boundTo = query.rangeAll ? null : (query.to ?? appliedTo);

  return (
    <>
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
          onChange={(next: EmailTriggersQuery["module"]) => {
            push({ module: next ?? null });
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
        <Button
          onClick={() => {
            push({
              module: null,
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

      {summary.satellitesUnavailable ? (
        <Alert
          className="mb-4"
          showIcon
          type="warning"
          title="Some module satellite tables are unavailable in this environment. Core counts still load."
        />
      ) : null}

      <div className="mb-2 flex flex-wrap items-baseline gap-3">
        <Title level={5} className="!mb-0">
          Trigger queue
        </Title>
        <Text type="secondary">{summary.total} notifications</Text>
      </div>
      <div className="mb-6 flex flex-wrap items-center gap-2">
        {summary.triggerByStatus
          .filter((item) => item.count > 0)
          .map((item) => (
            <Tag
              key={item.status}
              className="cursor-pointer px-3 py-1 text-sm"
              color={TRIGGER_COLOR[item.status]}
              onClick={() => {
                router.push(
                  notificationsDrilldownHref(employerId, query, {
                    status: item.status,
                    from: query.rangeAll ? null : appliedFrom,
                    to: query.rangeAll ? null : appliedTo,
                  }),
                );
              }}
            >
              {item.status} {item.count}
            </Tag>
          ))}
        {summary.total === 0 ? (
          <Text type="secondary">No trigger rows in this window.</Text>
        ) : null}
      </div>

      <Title level={5}>SMTP delivery</Title>
      <div className="mb-6 flex flex-wrap items-center gap-2">
        {DELIVERY_STATUSES.map((status) => {
          const count =
            summary.deliveryByStatus.find((item) => item.status === status)
              ?.count ?? 0;
          return (
            <Tag
              key={status}
              className="px-3 py-1 text-sm"
              color={count > 0 ? DELIVERY_COLOR[status] : undefined}
            >
              {status} {count}
            </Tag>
          );
        })}
      </div>

      <Title level={5}>By module</Title>
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {summary.triggerByModule.map((item) => (
          <Card
            key={item.module}
            size="small"
            className="cursor-pointer"
            onClick={() => {
              router.push(
                notificationsDrilldownHref(employerId, query, {
                  module: item.module,
                  from: query.rangeAll ? null : appliedFrom,
                  to: query.rangeAll ? null : appliedTo,
                }),
              );
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <Text>{item.label}</Text>
              <Text strong>{item.count}</Text>
            </div>
          </Card>
        ))}
      </div>

      <div className="flex items-center gap-1">
        <TableSqlButton script={queryScript} />
        <TableCompareButton script={queryScript} />
      </div>
    </>
  );
}
