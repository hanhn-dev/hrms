"use client";

import { Tag } from "antd";
import { useRouter } from "next/navigation";
import { DataTable } from "@/shared/ui/data-table";
import { listHref } from "@/shared/list-query";
import type { ColumnsType } from "antd/es/table";
import type { EmployeeSearchHit } from "@/features/employee/search/queries";
import { EntityLink } from "@/shared/entity-link";
import {
  EMPLOYEE_STATUS_FILTERS,
  employeeStatusColor,
  employeeStatusLabel,
  matchesEmployeeStatusFilter,
} from "@/features/employee/search/search-status";

/** Mirrors `@hrms/db` EMPLOYEE_LIST_SECTION_COLUMNS (client-safe; no Prisma barrel). */
const SECTION_COLUMNS: ReadonlyArray<{
  field: keyof EmployeeSearchHit & string;
  label: string;
}> = [
  { field: "skillCount", label: "Skills" },
  { field: "domainCount", label: "Domains" },
  { field: "passportVisaCount", label: "Passport & Visa" },
  { field: "pastEmploymentCount", label: "Past Employment" },
  { field: "bankCount", label: "Bank" },
  { field: "nominationCount", label: "Nomination" },
  { field: "educationCount", label: "Education" },
  { field: "familyCount", label: "Family" },
  { field: "nomineeCount", label: "Nominee" },
  { field: "contactCount", label: "Contact" },
  { field: "emergencyCount", label: "Emergency" },
  { field: "certificationCount", label: "Certifications" },
];

const COUNT_FILTERS = [
  { text: "0", value: "eq:0" },
  { text: "≥ 1", value: "gte:1" },
  { text: "≥ 2", value: "gte:2" },
  { text: "≥ 5", value: "gte:5" },
] as const;

type EmployeeColumn = ColumnsType<EmployeeSearchHit>[number] & {
  tableSearch?: boolean;
};

function matchesCountFilter(count: number, raw: unknown): boolean {
  const value = String(raw);
  if (value.startsWith("eq:")) {
    return count === Number(value.slice(3));
  }
  if (value.startsWith("gte:")) {
    return count >= Number(value.slice(4));
  }
  return true;
}

function sectionCountColumns(unavailableFields: ReadonlySet<string>): EmployeeColumn[] {
  return SECTION_COLUMNS.map((section) => {
    const unavailable = unavailableFields.has(section.field);
    return {
      title: section.label,
      dataIndex: section.field,
      key: section.field,
      width: 120,
      align: "right" as const,
      tableSearch: false,
      sorter: unavailable
        ? undefined
        : (a: EmployeeSearchHit, b: EmployeeSearchHit) =>
            Number(a[section.field]) - Number(b[section.field]),
      filters: unavailable ? undefined : [...COUNT_FILTERS],
      onFilter: unavailable
        ? undefined
        : (value: unknown, record: EmployeeSearchHit) =>
            matchesCountFilter(Number(record[section.field]), value),
      render: unavailable ? () => "—" : undefined,
    };
  });
}

export function EmployeeSearchTable({
  employerId,
  page,
  pageSize,
  search,
  results,
  total,
  unavailableFields = [],
  queryScript,
}: {
  employerId: number;
  page: number;
  pageSize: number;
  search: string;
  results: EmployeeSearchHit[];
  total: number;
  unavailableFields?: readonly string[];
  queryScript: string;
}): React.JSX.Element {
  const router = useRouter();
  const path = `/employers/${employerId}/employees`;
  const unavailable = new Set(unavailableFields);
  const roleFilters = Array.from(
      new Set(results.map((row) => row.roleName?.trim() || "—").filter(Boolean)),
    )
      .sort((a, b) => a.localeCompare(b))
      .map((role) => ({ text: role, value: role }));
  const columns: ColumnsType<EmployeeSearchHit> = [
      {
        title: "Employee ID",
        dataIndex: "employeeId",
        width: 140,
        sorter: (a, b) => a.employeeId - b.employeeId,
      },
      {
        title: "Employment no.",
        dataIndex: "employmentNumber",
        width: 160,
        sorter: (a, b) => a.employmentNumber.localeCompare(b.employmentNumber),
        render: (value: string) => (
          <EntityLink
            employerId={employerId}
            entity={{ kind: "employee", employmentNumber: value }}
          >
            {value}
          </EntityLink>
        ),
      },
      {
        title: "Name",
        dataIndex: "fullName",
        width: 240,
        ellipsis: true,
        sorter: (a, b) => a.fullName.localeCompare(b.fullName),
      },
      {
        title: "Email",
        dataIndex: "workEmail",
        width: 280,
        ellipsis: true,
      },
      {
        title: "Role",
        dataIndex: "roleName",
        width: 180,
        ellipsis: true,
        filters: roleFilters,
        onFilter: (value, record) => (record.roleName?.trim() || "—") === String(value),
      },
      {
        title: "Status",
        dataIndex: "employeeStatus",
        width: 160,
        filters: [...EMPLOYEE_STATUS_FILTERS],
        onFilter: (value, record) =>
          matchesEmployeeStatusFilter(record.employeeStatus, value),
        render: (value: string | null) => (
          <Tag color={employeeStatusColor(value)}>{employeeStatusLabel(value)}</Tag>
        ),
      },
      ...sectionCountColumns(unavailable),
    ];

  return (
    <DataTable
      queryScript={queryScript}
      rowKey="employeeId"
      dataSource={results}
      scroll={{ x: "max-content" }}
      searchQuery={search}
      onSearch={(next) => {
        router.push(listHref(path, { page: 1, pageSize, q: next || null }));
      }}
      pagination={{
        current: page,
        pageSize,
        total,
        showSizeChanger: false,
        showTotal: (count) => `${count} employees`,
        onChange: (next, nextSize) => {
          router.push(listHref(path, { page: next, pageSize: nextSize, q: search || null }));
        },
      }}
      locale={{
        emptyText: search
          ? "No employees matched."
          : "No employees found for this employer.",
      }}
      columns={columns}
    />
  );
}
