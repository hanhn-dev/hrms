"use client";

import { useMemo, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Card,
  DatePicker,
  Empty,
  Pagination,
  Segmented,
  Select,
  Space,
  Tag,
  Typography,
} from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { DataTable } from "@/shared/ui/data-table";
import {
  HISTORY_SECTIONS,
  HISTORY_VIEW_OPTIONS,
  type HistoryViewFilter,
} from "@/features/employee/history/catalog";
import { formatDate } from "@/shared/format-date";

const { Text } = Typography;

export type HistoryPanelEvent = {
  timeStamp: string;
  editor: { name: string; id: string };
  section: string;
  changes: Array<{
    field: string;
    oldValue: string;
    newValue: string;
    changeType: string;
    effectiveDate?: string;
    futureTransId?: string;
  }>;
};

const CHANGE_COLORS: Record<string, string> = {
  ADDED: "green",
  MODIFIED: "blue",
  REMOVED: "red",
};

export function HistoryPanel({
  type,
  section,
  from,
  to,
  pageNumber,
  pageSize,
  totalItems,
  events,
  queryScript,
}: {
  type: HistoryViewFilter;
  section: string | null;
  from: string | null;
  to: string | null;
  pageNumber: number;
  pageSize: number;
  totalItems: number;
  events: HistoryPanelEvent[];
  queryScript: string;
}): React.JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  const dateRange = useMemo((): [Dayjs | null, Dayjs | null] | null => {
    if (!from && !to) {
      return null;
    }
    return [from ? dayjs(from) : null, to ? dayjs(to) : null];
  }, [from, to]);

  function updateQuery(patch: Record<string, string | null>): void {
    const next = new URLSearchParams();
    const current: Record<string, string | null> = {
      type: type === "History" ? null : type,
      section,
      from,
      to,
      page: pageNumber > 1 ? String(pageNumber) : null,
    };
    for (const [key, value] of Object.entries({ ...current, ...patch })) {
      if (value == null || value === "") {
        continue;
      }
      next.set(key, value);
    }
    // Explicit deletes from patch
    for (const [key, value] of Object.entries(patch)) {
      if (value == null || value === "") {
        next.delete(key);
      }
    }
    const query = next.toString();
    startTransition(() => {
      router.push(query ? `${pathname}?${query}` : pathname);
    });
  }

  return (
    <Space className="w-full" orientation="vertical" size="middle">
      <div className="flex flex-wrap items-center gap-2">
        <Segmented
          options={HISTORY_VIEW_OPTIONS}
          value={type}
          onChange={(value) => {
            updateQuery({
              type: String(value) === "History" ? null : String(value),
              page: null,
              ...(value === "Future"
                ? { section: "Current Employment Details" }
                : { section }),
              ...(value === "Pending" || value === "Future"
                ? { from: null, to: null }
                : {}),
            });
          }}
        />
        <Select
          allowClear
          className="min-w-56"
          placeholder="All sections"
          disabled={type === "Future"}
          value={section}
          options={HISTORY_SECTIONS.map((item) => ({
            value: item.name,
            label: item.label,
          }))}
          onChange={(value) => {
            updateQuery({
              section: value ?? null,
              page: null,
            });
          }}
        />
        {type === "History" ? (
          <DatePicker.RangePicker
            value={dateRange}
            onChange={(values) => {
              updateQuery({
                from: values?.[0]?.format("YYYY-MM-DD") ?? null,
                to: values?.[1]?.format("YYYY-MM-DD") ?? null,
                page: null,
              });
            }}
          />
        ) : null}
      </div>

      {events.length === 0 ? (
        <Card>
          <Empty
            description={
              pending
                ? "Loading history…"
                : type === "History"
                  ? "No history events in this date window."
                  : `No ${type === "Future" ? "future" : "pending"} changes.`
            }
          />
        </Card>
      ) : (
        <Space className="w-full" orientation="vertical" size="middle">
          {events.map((event, eventIndex) => (
            <Card
              key={[
                eventIndex,
                event.timeStamp,
                event.section,
                event.editor.id,
                event.editor.name,
                event.changes.length,
                ...event.changes.map(
                  (change) =>
                    `${change.field}:${change.changeType}:${change.oldValue}:${change.newValue}:${change.futureTransId ?? ""}`,
                ),
              ].join("|")}
              size="small"
              title={
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <Text strong>{event.section}</Text>
                  <Text type="secondary">{formatDate(event.timeStamp)}</Text>
                  <Text type="secondary">
                    by {event.editor.name}
                    {event.editor.id ? ` (${event.editor.id})` : ""}
                  </Text>
                </div>
              }
            >
              <DataTable
                queryScript={queryScript}
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={event.changes.map((change, changeIndex) => ({
                  ...change,
                  key: [
                    changeIndex,
                    change.field,
                    change.changeType,
                    change.oldValue,
                    change.newValue,
                    change.futureTransId ?? "",
                  ].join("|"),
                }))}
                columns={[
                  {
                    title: "Field",
                    dataIndex: "field",
                    width: 220,
                  },
                  {
                    title: "Change",
                    dataIndex: "changeType",
                    width: 110,
                    render: (value: string) => (
                      <Tag color={CHANGE_COLORS[value] ?? "default"}>{value}</Tag>
                    ),
                  },
                  {
                    title: "Old",
                    dataIndex: "oldValue",
                    render: (value: string) => value || "—",
                  },
                  {
                    title: "New",
                    dataIndex: "newValue",
                    render: (value: string) => value || "—",
                  },
                  ...(type === "Future"
                    ? [
                        {
                          title: "Effective",
                          dataIndex: "effectiveDate",
                          width: 140,
                          render: (value: string | undefined) =>
                            value ? formatDate(value) : "—",
                        },
                        {
                          title: "FutureTransID",
                          dataIndex: "futureTransId",
                          width: 120,
                          render: (value: string | undefined) => value || "—",
                        },
                      ]
                    : []),
                ]}
              />
            </Card>
          ))}
          <Pagination
            current={pageNumber}
            pageSize={pageSize}
            total={totalItems}
            showTotal={(total) => `${total} events`}
            onChange={(page) => {
              updateQuery({ page: page > 1 ? String(page) : null });
            }}
          />
        </Space>
      )}
    </Space>
  );
}
