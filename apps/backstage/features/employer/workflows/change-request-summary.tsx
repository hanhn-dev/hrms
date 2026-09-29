"use client";

import { useMemo } from "react";
import { Descriptions, Space, Table, Typography } from "antd";
import {
  EmployeeNameLink,
  KindChip,
  NameChips,
  WorkflowChip,
  changeKindFromRow,
  sectionNamesFrom,
} from "@/features/employer/workflows/change-request-labels";
import type { ChangeRequestDetail } from "@/features/employer/workflows/queries";
import { formatDate } from "@/shared/format-date";

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
          { key: "id", label: "Request", children: detail.header.changeRequestId },
          { key: "page", label: "Page", children: detail.header.pageName ?? "—" },
          {
            key: "sections",
            label: "Section",
            children: <NameChips names={sectionNames} />,
          },
          {
            key: "employee",
            label: "Employee",
            children: (
              <EmployeeNameLink
                employerId={employerId}
                name={detail.header.employeeName}
                employmentNumber={detail.header.employmentNumber}
              />
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
            children: <WorkflowChip name={detail.header.workflowName} />,
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
            { title: "Field", dataIndex: "fieldName" },
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
