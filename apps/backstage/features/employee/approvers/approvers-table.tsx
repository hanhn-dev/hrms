"use client";

import { useMemo, useState } from "react";
import { Input, Tag, Typography } from "antd";
import { DataTable } from "@/shared/ui/data-table";
import {
  approverLabel,
  filterApproverRows,
  personLabel,
} from "@/features/employee/approvers/approvers-display";
import type { EmployeeApproverPerson, EmployeeApprovers } from "@/features/employee/approvers/queries";
import { EntityLink } from "@/shared/entity-link/entity-link";
import { HighlightMatch } from "@/shared/ui/highlight-match";

export function ApproversTable({
  employerId,
  result,
  queryScript,
}: {
  employerId: number;
  result: EmployeeApprovers;
  queryScript: string;
}): React.JSX.Element {
  const [query, setQuery] = useState("");
  const rows = useMemo(
    () => filterApproverRows(result.rows, query),
    [query, result.rows],
  );

  return (
    <>
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ContextValue label="Location" value={result.locationName} />
        <ContextValue label="Business unit" value={result.businessUnitName} />
        <ContextPerson
          employerId={employerId}
          label="Functional manager"
          person={result.functionalManager}
        />
        <ContextPerson
          employerId={employerId}
          label="Reporting manager"
          person={result.reportingManager}
        />
      </div>
      <Input
        allowClear
        className="mb-4 max-w-md"
        placeholder="Search module, page, or workflow"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <DataTable
        queryScript={queryScript}
        rowKey="rowKey"
        dataSource={rows}
        size="small"
        scroll={{ x: "max-content" }}
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          showTotal: (total) => `${total} rows`,
        }}
        locale={{
          emptyText: query.trim()
            ? "No workflows matched."
            : "No workflow pages are enabled for this employer.",
        }}
        columns={[
          {
            title: "Approvers",
            dataIndex: "people",
            width: 320,
            ellipsis: true,
            onCell: () => ({ style: { maxWidth: 320 } }),
            render: (_value: EmployeeApproverPerson[], row) => (
              <ApproverCell employerId={employerId} row={row} />
            ),
          },
          {
            title: "Module",
            dataIndex: "moduleName",
            width: 160,
            render: (value: string) => <HighlightMatch query={query} text={value} />,
          },
          {
            title: "Page",
            dataIndex: "pageName",
            width: 220,
            render: (value: string) => <HighlightMatch query={query} text={value} />,
          },
          {
            title: "Workflow",
            dataIndex: "workflowName",
            width: 280,
            render: (_value: string | null, row) => (
              <WorkflowCell employerId={employerId} query={query} row={row} />
            ),
          },
          { title: "How it applies", dataIndex: "scopeLabel", width: 220 },
          {
            title: "Level",
            dataIndex: "level",
            width: 80,
            render: (value: number | null) => value ?? "—",
          },
          {
            title: "Role",
            dataIndex: "roleName",
            width: 220,
            render: (value: string | null) => value ?? "—",
          },
        ]}
      />
    </>
  );
}

function ContextValue({
  label,
  value,
}: {
  label: string;
  value: string | null;
}): React.JSX.Element {
  return (
    <div>
      <Typography.Text type="secondary">{label}</Typography.Text>
      <div>{value ?? "—"}</div>
    </div>
  );
}

function ContextPerson({
  employerId,
  label,
  person,
}: {
  employerId: number;
  label: string;
  person: EmployeeApproverPerson | null;
}): React.JSX.Element {
  return (
    <div>
      <Typography.Text type="secondary">{label}</Typography.Text>
      <div>
        {person ? (
          <PersonLink
            employerId={employerId}
            label={personLabel(person)}
            person={person}
          />
        ) : (
          "—"
        )}
      </div>
    </div>
  );
}

function WorkflowCell({
  employerId,
  query,
  row,
}: {
  employerId: number;
  query: string;
  row: EmployeeApprovers["rows"][number];
}): React.JSX.Element {
  if (row.workflowId == null || !row.workflowName) {
    return <>—</>;
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <EntityLink
        employerId={employerId}
        entity={{ kind: "workflow", workflowId: row.workflowId }}
      >
        <HighlightMatch query={query} text={row.workflowName} />
      </EntityLink>
      {row.skipWorkFlow ? <Tag className="m-0">Skip</Tag> : null}
      {row.autoApproved ? <Tag className="m-0">Auto-approve</Tag> : null}
      {row.notificationOnly ? <Tag className="m-0">Notification only</Tag> : null}
    </span>
  );
}

function approverText(row: EmployeeApprovers["rows"][number]): string {
  if (row.people.length === 0) {
    return row.note ?? "—";
  }
  return row.people.map((person) => approverLabel(person)).join(", ");
}

function ApproverCell({
  employerId,
  row,
}: {
  employerId: number;
  row: EmployeeApprovers["rows"][number];
}): React.JSX.Element {
  const text = approverText(row);
  return (
    <div className="max-w-xs truncate" title={text}>
      {row.people.length === 0 ? (
        <Typography.Text type="secondary">{text}</Typography.Text>
      ) : (
        row.people.map((person, index) => (
          <span key={person.employeeId}>
            {index > 0 ? ", " : null}
            <PersonLink
              employerId={employerId}
              label={approverLabel(person)}
              person={person}
            />
          </span>
        ))
      )}
    </div>
  );
}

function PersonLink({
  employerId,
  label,
  person,
}: {
  employerId: number;
  label: string;
  person: EmployeeApproverPerson;
}): React.JSX.Element {
  return (
    <EntityLink
      employerId={employerId}
      entity={
        person.employmentNumber
          ? { kind: "employee", employmentNumber: person.employmentNumber }
          : null
      }
    >
      {label}
    </EntityLink>
  );
}
