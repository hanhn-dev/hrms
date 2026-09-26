"use client";

import { Form, Select, Space } from "antd";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  commitAssignRole,
  previewAssignRole,
} from "@/features/employee/access/mutations";
import { ConfirmWriteModal } from "@/shared/ui";

type RoleOption = { roleId: number; roleName: string };

export function AccessActions({
  employerId,
  employmentNumber,
  currentRoleId,
  roles,
  writesEnabled,
}: {
  employerId: number;
  employmentNumber: string;
  currentRoleId: number | null;
  roles: RoleOption[];
  writesEnabled: boolean;
}): React.JSX.Element {
  const router = useRouter();
  const [roleId, setRoleId] = useState<number | null>(currentRoleId);

  return (
    <Space orientation="vertical" className="w-full" size="middle">
      <Form layout="inline">
        <Form.Item label="Role">
          <Select
            className="min-w-64"
            disabled={!writesEnabled}
            optionFilterProp="label"
            showSearch
            value={roleId ?? undefined}
            options={roles.map((role) => ({
              label: `${role.roleName} (${role.roleId})`,
              value: role.roleId,
            }))}
            onChange={setRoleId}
          />
        </Form.Item>
        <ConfirmWriteModal
          buttonLabel="Assign role"
          disabled={!writesEnabled || !roleId}
          disabledReason={
            writesEnabled ? "Select a role." : "Writes are disabled."
          }
          title="Assign role"
          previewAction={() =>
            previewAssignRole({
              employerId,
              employmentNumber,
              roleId: roleId ?? 0,
            })
          }
          commitAction={commitAssignRole}
          onDone={() => {
            router.refresh();
          }}
        />
      </Form>
    </Space>
  );
}
