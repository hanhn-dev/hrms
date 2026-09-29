"use client";

import { Space, Tag } from "antd";
import Link from "next/link";

const SECTION_CHIP = "blue";
const WORKFLOW_CHIP = "blue";

const KIND_COLOR = {
  Added: "green",
  Edited: "gold",
  Deleted: "red",
} as const;

export type ChangeKind = keyof typeof KIND_COLOR;

export function splitNames(value: string | null | undefined): string[] {
  if (!value) {
    return [];
  }
  return [
    ...new Set(
      value
        .split(",")
        .map((name) => name.trim())
        .filter(Boolean),
    ),
  ];
}

export function sectionNamesFrom(
  headerNames: string | null | undefined,
  rows: Array<{ sectionName: string | null }>,
): string[] {
  const fromRows = [
    ...new Set(
      rows.map((row) => row.sectionName?.trim()).filter((name): name is string => Boolean(name)),
    ),
  ];
  return fromRows.length > 0 ? fromRows : splitNames(headerNames);
}

export function NameChips({
  names,
  fallback = "—",
}: {
  names: string[];
  fallback?: string;
}): React.JSX.Element {
  if (names.length === 0) {
    return <>{fallback}</>;
  }
  return (
    <Space size={4} wrap>
      {names.map((name) => (
        <Tag key={name} color={SECTION_CHIP} className="m-0">
          {name}
        </Tag>
      ))}
    </Space>
  );
}

export function WorkflowChip({
  name,
}: {
  name: string | null;
}): React.JSX.Element {
  if (!name) {
    return <>{"—"}</>;
  }
  return (
    <Tag color={WORKFLOW_CHIP} className="m-0">
      {name}
    </Tag>
  );
}

function isBlank(value: string | null | undefined): boolean {
  return value == null || value.trim() === "";
}

/** `IsNew` is Added; a cleared new value with an old value is Deleted (My Details). */
export function changeKindFromRow(row: {
  isNew: boolean;
  oldValue: string | null;
  newValue: string | null;
}): ChangeKind {
  if (row.isNew) {
    return "Added";
  }
  if (!isBlank(row.oldValue) && isBlank(row.newValue)) {
    return "Deleted";
  }
  return "Edited";
}

export function KindChip({ kind }: { kind: ChangeKind }): React.JSX.Element {
  return (
    <Tag color={KIND_COLOR[kind]} className="m-0">
      {kind}
    </Tag>
  );
}

export function employeeHref(
  employerId: number,
  employmentNumber: string | null,
): string | null {
  if (!employmentNumber) {
    return null;
  }
  return `/features/employers/${employerId}/employees/${encodeURIComponent(employmentNumber)}`;
}

export function EmployeeNameLink({
  employerId,
  name,
  employmentNumber,
}: {
  employerId: number;
  name: string;
  employmentNumber: string | null;
}): React.JSX.Element {
  const label = employmentNumber ? `${name} · ${employmentNumber}` : name;
  const href = employeeHref(employerId, employmentNumber);
  if (!href) {
    return <>{label}</>;
  }
  return (
    <Link href={href} onClick={(event) => event.stopPropagation()}>
      {label}
    </Link>
  );
}
