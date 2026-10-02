export const RECENT_EMPLOYEE_LIMIT = 8;

export type RecentEmployee = {
  employmentNumber: string;
  fullName: string;
  viewedAt: string;
};

type RecentEmployeeStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

export function recentEmployeesStorageKey(employerId: number): string {
  return `backstage:recent-employees:${employerId}`;
}

export function readRecentEmployees(raw: string | null): RecentEmployee[] {
  if (!raw) {
    return [];
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) {
    return [];
  }

  const seen = new Set<string>();
  const employees: RecentEmployee[] = [];
  for (const row of parsed
    .filter(isRecentEmployee)
    .sort((a, b) => b.viewedAt.localeCompare(a.viewedAt))) {
    const employmentNumber = row.employmentNumber.trim();
    if (seen.has(employmentNumber)) {
      continue;
    }
    seen.add(employmentNumber);
    employees.push({
      employmentNumber,
      fullName: row.fullName.trim(),
      viewedAt: row.viewedAt,
    });
    if (employees.length === RECENT_EMPLOYEE_LIMIT) {
      break;
    }
  }
  return employees;
}

export function recordRecentEmployee(
  current: readonly RecentEmployee[],
  next: { employmentNumber: string; fullName: string },
  viewedAt: string,
): RecentEmployee[] {
  const employmentNumber = next.employmentNumber.trim();
  const fullName = next.fullName.trim();
  if (!employmentNumber || !fullName || !viewedAt.trim()) {
    return [...current];
  }
  return [
    { employmentNumber, fullName, viewedAt },
    ...current.filter((row) => row.employmentNumber !== employmentNumber),
  ].slice(0, RECENT_EMPLOYEE_LIMIT);
}

export function loadRecentEmployees(
  storage: RecentEmployeeStorage,
  employerId: number,
): RecentEmployee[] {
  return readRecentEmployees(
    storage.getItem(recentEmployeesStorageKey(employerId)),
  );
}

export function saveRecentEmployee(
  storage: RecentEmployeeStorage,
  employerId: number,
  employee: { employmentNumber: string; fullName: string },
  viewedAt: string,
): void {
  const key = recentEmployeesStorageKey(employerId);
  const next = recordRecentEmployee(
    readRecentEmployees(storage.getItem(key)),
    employee,
    viewedAt,
  );
  storage.setItem(key, JSON.stringify(next));
}

function isRecentEmployee(value: unknown): value is RecentEmployee {
  if (!value || typeof value !== "object") {
    return false;
  }
  const row = value as Record<string, unknown>;
  return (
    typeof row.employmentNumber === "string" &&
    row.employmentNumber.trim() !== "" &&
    typeof row.fullName === "string" &&
    row.fullName.trim() !== "" &&
    typeof row.viewedAt === "string" &&
    row.viewedAt.trim() !== ""
  );
}
