"use client";

import { Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import Link from "next/link";
import type { EmployeeSearchHit } from "@/features/employee/search/queries";

function isActiveFlag(value: unknown): boolean {
  return value === true || value === "Y" || value === "1" || value === 1;
}

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

function sectionCountColumns(): ColumnsType<EmployeeSearchHit> {
  return SECTION_COLUMNS.map((section) => ({
    title: section.label,
    dataIndex: section.field,
    key: section.field,
    width: 120,
    align: "right" as const,
    sorter: (a, b) => Number(a[section.field]) - Number(b[section.field]),
    filters: [...COUNT_FILTERS],
    onFilter: (value, record) =>
      matchesCountFilter(Number(record[section.field]), value),
  }));
}

export function EmployeeSearchTable({
  employerId,
  search,
  results,
}: {
  employerId: number;
  search: string;
  results: EmployeeSearchHit[];
}): React.JSX.Element {
  return (
    <Table
      rowKey="employeeId"
      dataSource={results}
      scroll={{ x: "max-content" }}
      pagination={{
        pageSize: 20,
        showSizeChanger: true,
        showTotal: (total) => `${total} employees`,
      }}
      locale={{
        emptyText: search
          ? "No employees matched."
          : "No employees found for this employer.",
      }}
      columns={[
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
          sorter: (a, b) =>
            a.employmentNumber.localeCompare(b.employmentNumber),
          render: (value: string) => (
            <Link
              href={`/features/employers/${employerId}/employees/${encodeURIComponent(value)}`}
            >
              {value}
            </Link>
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
          filters: Array.from(
            new Set(
              results
                .map((row) => row.roleName?.trim() || "—")
                .filter(Boolean),
            ),
          )
            .sort((a, b) => a.localeCompare(b))
            .map((role) => ({ text: role, value: role })),
          onFilter: (value, record) =>
            (record.roleName?.trim() || "—") === String(value),
        },
        {
          title: "Active",
          dataIndex: "isActive",
          width: 110,
          filters: [
            { text: "Active", value: "active" },
            { text: "Inactive", value: "inactive" },
          ],
          onFilter: (value, record) =>
            value === "active"
              ? isActiveFlag(record.isActive)
              : !isActiveFlag(record.isActive),
          render: (value: unknown) =>
            isActiveFlag(value) ? (
              <Tag color="green">Active</Tag>
            ) : (
              <Tag color="red">Inactive</Tag>
            ),
        },
        ...sectionCountColumns(),
      ]}
    />
  );
}
