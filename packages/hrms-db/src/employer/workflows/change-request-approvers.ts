export type ChangeRequestApprover = {
  employeeId: number;
  name: string;
  employmentNumber: string | null;
};

export type ChangeRequestQueueActor = {
  approveStatus: string | null;
  approvalLevel: number | null;
  managerId: number | null;
  managerName: string | null;
  managerEmploymentNumber: string | null;
  updatedBy: number | null;
  updatedByName: string | null;
  updatedByEmploymentNumber: string | null;
};

function statusOf(row: ChangeRequestQueueActor): string {
  return (row.approveStatus ?? "").trim().toUpperCase();
}

function levelOf(row: ChangeRequestQueueActor): number {
  return row.approvalLevel ?? Number.NEGATIVE_INFINITY;
}

function personFrom(
  employeeId: number | null,
  name: string | null,
  employmentNumber: string | null,
): ChangeRequestApprover | null {
  if (employeeId == null || !Number.isInteger(employeeId) || employeeId <= 0) {
    return null;
  }
  const trimmedName = name?.trim() ?? "";
  const trimmedNumber = employmentNumber?.trim() ?? "";
  return {
    employeeId,
    name: trimmedName || `Employee ${employeeId}`,
    employmentNumber: trimmedNumber || null,
  };
}

function uniquePeople(people: ChangeRequestApprover[]): ChangeRequestApprover[] {
  const seen = new Set<number>();
  const unique: ChangeRequestApprover[] = [];
  for (const person of people) {
    if (seen.has(person.employeeId)) {
      continue;
    }
    seen.add(person.employeeId);
    unique.push(person);
  }
  return unique;
}

/**
 * Pending queue rows win: every positive ManagerId still waiting.
 * Otherwise the people who closed the highest approval level.
 * A closed step uses UpdatedBy when it is set, and ManagerId otherwise.
 */
export function pickChangeRequestApprovers(
  rows: ChangeRequestQueueActor[],
): ChangeRequestApprover[] {
  const pending = rows.filter((row) => statusOf(row) === "P");
  if (pending.length > 0) {
    return uniquePeople(
      pending.flatMap((row) => {
        const person = personFrom(row.managerId, row.managerName, row.managerEmploymentNumber);
        return person ? [person] : [];
      }),
    );
  }

  const closed = rows.filter((row) => {
    const status = statusOf(row);
    return status === "C" || status === "R";
  });
  if (closed.length === 0) {
    return [];
  }
  const maxLevel = Math.max(...closed.map(levelOf));
  return uniquePeople(
    closed
      .filter((row) => levelOf(row) === maxLevel)
      .flatMap((row) => {
        const acted =
          row.updatedBy != null && Number.isInteger(row.updatedBy) && row.updatedBy > 0;
        const person = acted
          ? personFrom(row.updatedBy, row.updatedByName, row.updatedByEmploymentNumber)
          : personFrom(row.managerId, row.managerName, row.managerEmploymentNumber);
        return person ? [person] : [];
      }),
  );
}
