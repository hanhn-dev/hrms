"use client";

import { useEffect, useState } from "react";
import { Space } from "antd";
import { EntityLink } from "@/shared/entity-link";
import { Text } from "@/shared/ui/antd-rsc";
import {
  loadRecentEmployees,
  type RecentEmployee,
} from "@/features/employee/recent/recent-employees";

export function RecentEmployeeStrip({
  employerId,
}: {
  employerId: number;
}): React.JSX.Element | null {
  const [recent, setRecent] = useState<RecentEmployee[]>([]);

  useEffect(() => {
    setRecent(loadRecentEmployees(localStorage, employerId));
  }, [employerId]);

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
