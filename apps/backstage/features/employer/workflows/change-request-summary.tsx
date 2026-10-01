"use client";

import { useMemo } from "react";
import { Descriptions, Space, Table, Typography } from "antd";
import {
  KindChip,
  changeKindFromRow,
  sectionNamesFrom,
} from "@/features/employer/workflows/change-request-labels";
import type { ChangeRequestDetail } from "@/features/employer/workflows/queries";
import { formatDate } from "@/shared/format-date";
import { EntityLink } from "@/shared/entity-link";

function personLabel(person: {
  name: string;
  employmentNumber: string | null;
}): string {
  return person.employmentNumber ? `${person.name} · ${person.employmentNumber}` : person.name;
}

export function ChangeRequestSummary({
  employerId,
  detail,
}: {
  employerId: number;
  detail: ChangeRequestDetail;
}): React.JSX.Element {
  const sectionNames = useMemo(
    () => sectionNamesFrom(detail.header.sectionNames, detail.details),
    [detail],
  );

  return (
    <Space className="w-full" orientation="vertical" size="middle">
      <Descriptions
        size="small"
        column={2}
        items={[
          { key: "id", label: "Request", children: (
            <EntityLink
              employerId={employerId}
              entity={{
                kind: "changeRequest",
                changeRequestId: detail.header.changeRequestId,
              }}
            >
              {detail.header.changeRequestId}
            </EntityLink>
          ) },
          {
            key: "page",
            label: "Page",
            children: (
              <EntityLink
                employerId={employerId}
                entity={
                  detail.header.pageName
                    ? { kind: "workflowPage", pageName: detail.header.pageName }
                    : null
                }
              >
                {detail.header.pageName ?? "—"}
              </EntityLink>
            ),
          },
          {
            key: "sections",
            label: "Section",
            children:
              sectionNames.length === 0 ? (
                "—"
              ) : (
                <Space size={4} wrap>
                  {sectionNames.map((name) => (
                    <EntityLink
                      key={name}
                      appearance="tag"
                      color="blue"
                      employerId={employerId}
                      entity={{ kind: "fieldSection", section: name }}
                    >
                      {name}
                    </EntityLink>
                  ))}
                </Space>
              ),
          },
          {
            key: "employee",
            label: "Employee",
            children: (
              <EntityLink
                employerId={employerId}
                entity={
                  detail.header.employmentNumber
                    ? {
                        kind: "employee",
                        employmentNumber: detail.header.employmentNumber,
                      }
                    : null
                }
              >
                {detail.header.employmentNumber
                  ? `${detail.header.employeeName} · ${detail.header.employmentNumber}`
                  : detail.header.employeeName}
              </EntityLink>
            ),
          },
          {
            key: "by",
            label: "Made by",
            children: detail.header.createdByName
              ? personLabel({
                  name: detail.header.createdByName,
                  employmentNumber: detail.header.createdByEmploymentNumber,
                })
              : "—",
          },
          {
            key: "workflow",
            label: "Workflow",
            children: detail.header.workflowName ? (
              <EntityLink
                appearance="tag"
                color="blue"
                employerId={employerId}
                entity={
                  detail.header.workflowId != null
                    ? { kind: "workflow", workflowId: detail.header.workflowId }
                    : null
                }
              >
                {detail.header.workflowName}
              </EntityLink>
            ) : (
              "—"
            ),
          },
          {
            key: "date",
            label: "Requested",
            children: formatDate(detail.header.requestedDate),
          },
        ]}
      />
      <div>
        <Typography.Text strong>Field changes</Typography.Text>
        <Table
          className="mt-2"
          rowKey="changeDetailsId"
          size="small"
          pagination={false}
          dataSource={detail.details}
          columns={[
            {
              title: "Field",
              dataIndex: "fieldName",
              render: (fieldName: string | null, row: ChangeRequestDetail["details"][number]) => (
                <EntityLink
                  employerId={employerId}
                  entity={
                    fieldName && row.sectionName
                      ? { kind: "field", section: row.sectionName, fieldName }
                      : null
                  }
                >
                  {fieldName ?? "—"}
                </EntityLink>
              ),
            },
            { title: "Old", dataIndex: "oldValue" },
            { title: "New", dataIndex: "newValue" },
            {
              title: "Kind",
              width: 100,
              render: (_: unknown, row: ChangeRequestDetail["details"][number]) => (
                <KindChip kind={changeKindFromRow(row)} />
              ),
            },
          ]}
        />
      </div>
    </Space>
  );
}
