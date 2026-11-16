"use client";

import { useState } from "react";
import { Button, Collapse, Input, Segmented } from "antd";
import Text from "antd/es/typography/Text";
import { DataTable } from "@/shared/ui/data-table";
import { useRouter } from "next/navigation";
import {
  notificationsHref,
  type NotificationsQuery,
} from "@/features/employer/notifications/notifications-source";
import type {
  PendingInboxCategory,
  PendingInboxList,
  PendingInboxRow,
} from "@/features/employer/notifications/queries";
import { filterInboxCategories } from "@/features/employer/notifications/filter-inbox-categories";
import { formatRequestTypeLabel } from "@/features/employer/notifications/format-request-type-label";
import { formatDate } from "@/shared/format-date";
import { EntityLink } from "@/shared/entity-link";
import type { InboxSide } from "@hrms/db/notifications";

function PersonLink({
  employerId,
  name,
  employmentNumber,
}: {
  employerId: number;
  name: string | null;
  employmentNumber: string | null;
}): React.JSX.Element {
  const label =
    name && employmentNumber
      ? `${name} (${employmentNumber})`
      : name || employmentNumber || "—";
  return (
    <EntityLink
      employerId={employerId}
      entity={
        employmentNumber ? { kind: "employee", employmentNumber } : null
      }
    >
      {label}
    </EntityLink>
  );
}

function TypeFilterButton({
  label,
  title,
  count,
  selected,
  onClick,
}: {
  label: string;
  title?: string;
  count: number;
  selected: boolean;
  onClick: () => void;
}): React.JSX.Element {
  return (
    <Button
      type={selected ? "primary" : "default"}
      className="flex h-auto min-h-10 w-full items-center justify-between gap-3 px-3 py-2 text-left"
      onClick={onClick}
    >
      <span className="truncate text-sm" title={title ?? label}>
        {label}
      </span>
      <Text
        className={`shrink-0 text-sm font-semibold tabular-nums ${
          selected ? "!text-inherit" : "!text-slate-600"
        }`}
      >
        {count}
      </Text>
    </Button>
  );
}

function CategoryTypeGrid({
  category,
  activeCategory,
  requestType,
  onSelectCategory,
  onSelectType,
}: {
  category: PendingInboxCategory;
  activeCategory: string | null;
  requestType: string | null;
  onSelectCategory: () => void;
  onSelectType: (nextRequestType: string) => void;
}): React.JSX.Element {
  const categorySelected =
    activeCategory === category.name && requestType == null;
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      <TypeFilterButton
        label="All"
        count={category.total}
        selected={categorySelected}
        onClick={onSelectCategory}
      />
      {category.types.map((item) => (
        <TypeFilterButton
          key={item.requestType}
          label={formatRequestTypeLabel(item.requestType)}
          title={item.requestType}
          count={item.count}
          selected={requestType === item.requestType}
          onClick={() => {
            onSelectType(item.requestType);
          }}
        />
      ))}
    </div>
  );
}

export function InboxPanel({
  employerId,
  query,
  result,
  queryScript,
}: {
  employerId: number;
  query: NotificationsQuery;
  result: PendingInboxList;
  queryScript: string;
}): React.JSX.Element {
  const router = useRouter();
  const [typeQuery, setTypeQuery] = useState("");

  const push = (patch: Partial<NotificationsQuery>): void => {
    router.push(
      notificationsHref(employerId, {
        ...query,
        ...patch,
        page: patch.page ?? 1,
      }),
    );
  };

  const filteredCategories = filterInboxCategories(result.categories, typeQuery);
  const defaultOpenKeys =
    typeQuery.trim().length === 0 &&
    result.activeCategory != null &&
    filteredCategories.some((category) => category.name === result.activeCategory)
      ? [result.activeCategory]
      : filteredCategories.map((category) => category.name);

  const tableTitle = query.requestType ?? result.activeCategory;

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Segmented
          value={query.side}
          options={[
            { label: "For Me", value: "for" satisfies InboxSide },
            { label: "By Me", value: "by" satisfies InboxSide },
          ]}
          onChange={(value) => {
            push({
              side: value as InboxSide,
              category: null,
              requestType: null,
            });
          }}
        />
        <Input.Search
          allowClear
          className="max-w-sm"
          placeholder="Filter request types"
          value={typeQuery}
          onChange={(event) => {
            setTypeQuery(event.target.value);
          }}
          onSearch={(value) => {
            setTypeQuery(value);
          }}
        />
      </div>
      <div className="mb-4">
        {filteredCategories.length === 0 ? (
          <Text type="secondary">No request types match this filter.</Text>
        ) : (
          <Collapse
            key={`${query.side}|${typeQuery}|${result.activeCategory ?? ""}`}
            defaultActiveKey={defaultOpenKeys}
            items={filteredCategories.map((category) => ({
              key: category.name,
              label: (
                <span className="text-sm font-medium text-slate-800">
                  {category.name}{" "}
                  <Text type="secondary">({category.total})</Text>
                </span>
              ),
              children: (
                <CategoryTypeGrid
                  category={category}
                  activeCategory={result.activeCategory}
                  requestType={query.requestType}
                  onSelectCategory={() => {
                    push({ category: category.name, requestType: null });
                  }}
                  onSelectType={(requestType) => {
                    push({
                      category: category.name,
                      requestType:
                        query.requestType === requestType ? null : requestType,
                    });
                  }}
                />
              ),
            }))}
          />
        )}
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
            setTypeQuery("");
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
      <DataTable<PendingInboxRow>
        queryScript={queryScript}
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
          onChange: (next, nextSize) => {
            push({ page: next, pageSize: nextSize });
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
            render: (_value, row) => (
              <PersonLink
                employerId={employerId}
                employmentNumber={row.subjectEmploymentNumber}
                name={row.subjectName}
              />
            ),
          },
          {
            title: "Waiting on",
            render: (_value, row) =>
              row.waitingOn.length === 0 ? (
                "—"
              ) : (
                <div className="flex flex-col gap-0.5">
                  {row.waitingOn.map((approver) => (
                    <PersonLink
                      key={`${approver.name ?? ""}-${approver.employmentNumber ?? ""}`}
                      employerId={employerId}
                      employmentNumber={approver.employmentNumber}
                      name={approver.name}
                    />
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
