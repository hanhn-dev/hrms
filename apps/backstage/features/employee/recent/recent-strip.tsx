"use client";

import { useSyncExternalStore } from "react";
import { Space } from "antd";
import { EntityLink } from "@/shared/entity-link";
import { Text } from "@/shared/ui/antd-rsc";
import {
  loadRecentEmployees,
  recentEmployeesStorageKey,
  type RecentEmployee,
} from "@/features/employee/recent/recent-employees";

const EMPTY_RECENT: RecentEmployee[] = [];

let cachedEmployerId = Number.NaN;
let cachedRaw: string | null = null;
let cachedRecent: RecentEmployee[] = EMPTY_RECENT;

function subscribeRecentEmployees(onStoreChange: () => void): () => void {
  const onStorage = (event: StorageEvent): void => {
    if (event.key == null || event.key.startsWith("backstage:recent-employees:")) {
      onStoreChange();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener("storage", onStorage);
  };
}

function readRecentSnapshot(employerId: number): RecentEmployee[] {
  const raw = localStorage.getItem(recentEmployeesStorageKey(employerId));
  if (cachedEmployerId === employerId && cachedRaw === raw) {
    return cachedRecent;
  }
  cachedEmployerId = employerId;
  cachedRaw = raw;
  cachedRecent = loadRecentEmployees(localStorage, employerId);
  return cachedRecent;
}

function getRecentServerSnapshot(): RecentEmployee[] {
  return EMPTY_RECENT;
}

export function RecentEmployeeStrip({
  employerId,
}: {
  employerId: number;
}): React.JSX.Element | null {
  const recent = useSyncExternalStore(
    subscribeRecentEmployees,
    () => readRecentSnapshot(employerId),
    getRecentServerSnapshot,
  );

  if (recent.length === 0) {
    return null;
  }

  return (
    <Space className="mb-4" size={8} wrap>
      <Text type="secondary">Recent</Text>
      {recent.map((employee) => (
        <EntityLink
          key={employee.employmentNumber}
          appearance="tag"
          employerId={employerId}
          entity={{
            kind: "employee",
            employmentNumber: employee.employmentNumber,
          }}
        >
          {employee.fullName} · {employee.employmentNumber}
        </EntityLink>
      ))}
    </Space>
  );
}
