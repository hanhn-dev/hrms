"use client";

import { Tag, Tooltip } from "antd";
import { changeRequestApproverText } from "@/features/employer/workflows/change-request-approver-label";
import { EntityLink } from "@/shared/entity-link";

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

export function ChangeRequestApprovers({
  employerId,
  approvers,
}: {
  employerId: number;
  approvers: Array<{
    employeeId: number;
    name: string;
    employmentNumber: string | null;
  }>;
}): React.JSX.Element {
  if (approvers.length === 0) {
    return <>{"—"}</>;
  }
  return (
    <span>
      {approvers.map((person, index) => {
        const number = person.employmentNumber?.trim();
        const label = (
          <EntityLink
            employerId={employerId}
            entity={
              number ? { kind: "employee", employmentNumber: number } : null
            }
          >
            {changeRequestApproverText(person)}
          </EntityLink>
        );
        return (
          <span key={person.employeeId}>
            {index > 0 ? ", " : null}
            {number ? (
              <Tooltip title={person.name}>
                <span>{label}</span>
              </Tooltip>
            ) : (
              label
            )}
          </span>
        );
      })}
    </span>
  );
}

export function KindChip({ kind }: { kind: ChangeKind }): React.JSX.Element {
  return (
    <Tag color={KIND_COLOR[kind]} className="m-0">
      {kind}
    </Tag>
  );
}
