"use client";

import { Button, Input, Table, Tag } from "antd";
import { useRouter } from "next/navigation";
import {
  notificationsHref,
  type NotificationsQuery,
} from "@/features/employer/notifications/notifications-source";
import type {
  PendingInboxList,
  PendingInboxRow,
} from "@/features/employer/notifications/queries";
import { formatDate } from "@/shared/format-date";
import type { InboxSide } from "@hrms/db/notifications";

function person(name: string | null, employmentNumber: string | null): string {
  if (name && employmentNumber) {
    return `${name} (${employmentNumber})`;
  }
  return name || employmentNumber || "—";
}

export function InboxPanel({
  employerId,
  query,
  result,
}: {
  employerId: number;
  query: NotificationsQuery;
  result: PendingInboxList;
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

  const tableTitle = query.requestType ?? result.activeCategory;

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Tag
          className="cursor-pointer"
          color={query.side === "for" ? "blue" : undefined}
          onClick={() => {
            push({ side: "for", category: null, requestType: null });
          }}
        >
          For Me
        </Tag>
        <Tag
          className="cursor-pointer"
          color={query.side === "by" ? "blue" : undefined}
          onClick={() => {
            push({ side: "by", category: null, requestType: null });
          }}
        >
          By Me
        </Tag>
      </div>
      <div className="mb-3 flex flex-col gap-3">
        {result.categories.map((category) => {
          const categorySelected =
            result.activeCategory === category.name && query.requestType == null;
          return (
            <div key={category.name}>
              <div className="mb-1 text-sm font-medium text-slate-700">
                {category.name}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Tag
                  className="cursor-pointer"
                  color={categorySelected ? "blue" : undefined}
                  onClick={() => {
                    push({ category: category.name, requestType: null });
                  }}
                >
                  All {category.total}
                </Tag>
                {category.types.map((item) => (
                  <Tag
                    key={item.requestType}
                    className="cursor-pointer"
                    color={
                      query.requestType === item.requestType ? "blue" : undefined
                    }
                    onClick={() => {
                      push({
                        category: category.name,
                        requestType:
                          query.requestType === item.requestType
                            ? null
                            : item.requestType,
                      });
                    }}
                  >
                    {item.requestType} {item.count}
                  </Tag>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input.Search
          allowClear
          className="max-w-sm"
          key={`${query.side}-${query.employee ?? ""}`}
          defaultValue={query.employee ?? ""}
          placeholder="Employment number or name"
          onSearch={(value) => {
            push({ employee: value.trim() || null });
          }}
        />
        <Button
          onClick={() => {
            push({
              side: "for" satisfies InboxSide,
              category: null,
              requestType: null,
              employee: null,
            });
          }}
        >
          Reset
        </Button>
        <span className="text-sm text-slate-500">
          {query.side === "for"
            ? "Pending items waiting on a manager in this employer."
            : "Pending items raised for an employee of this employer."}
        </span>
      </div>
      {tableTitle ? (
        <div className="mb-2 text-sm font-medium text-slate-700">{tableTitle}</div>
      ) : null}
      <Table<PendingInboxRow>
        rowKey={(row) => `${row.requestType}-${row.requestId}`}
        dataSource={result.rows}
        size="small"
        scroll={{ x: "max-content" }}
        locale={{ emptyText: "No pending notifications match the current filters." }}
        pagination={{
          current: result.page,
          pageSize: result.pageSize,
          total: result.totalCount,
          showSizeChanger: false,
          showTotal: (count) => `${count} requests`,
          onChange: (next) => {
            push({ page: next });
          },
        }}
        columns={[
          { title: "Request type", dataIndex: "requestType" },
          { title: "Request id", dataIndex: "requestId" },
          {
            title: "Level",
            dataIndex: "approvalLevel",
            render: (value: string | null) => value || "—",
          },
          {
            title: "Subject",
            render: (_value, row) =>
              person(row.subjectName, row.subjectEmploymentNumber),
          },
          {
            title: "Waiting on",
            render: (_value, row) =>
              row.waitingOn.length === 0 ? (
                "—"
              ) : (
                <div className="flex flex-col gap-0.5">
                  {row.waitingOn.map((approver) => (
                    <span
                      key={`${approver.name ?? ""}-${approver.employmentNumber ?? ""}`}
                    >
                      {person(approver.name, approver.employmentNumber)}
                    </span>
                  ))}
                </div>
              ),
          },
          {
            title: "Created",
            dataIndex: "createdDate",
            render: (value: string | null) => formatDate(value),
          },
          {
            title: "Reassign reason",
            dataIndex: "reassignReason",
            render: (value: string | null) => value || "—",
          },
        ]}
      />
    </>
  );
}
