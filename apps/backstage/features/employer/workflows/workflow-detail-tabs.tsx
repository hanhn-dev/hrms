"use client";

import { Tabs } from "antd";
import { useRouter } from "next/navigation";
import {
  workflowHref,
  type WorkflowDetailTab,
} from "@/features/employer/workflows/workflows-source";

export function WorkflowDetailTabs({
  employerId,
  workflowId,
  tab,
  children,
}: {
  employerId: number;
  workflowId: number | "new";
  tab: WorkflowDetailTab;
  children: React.ReactNode;
}): React.JSX.Element {
  const router = useRouter();
  const isCreate = workflowId === "new";
  return (
    <Tabs
      activeKey={tab}
      destroyOnHidden
      items={[
        {
          key: "details",
          label: "Details",
          children: tab === "details" ? children : null,
        },
        {
          key: "tree",
          label: isCreate ? (
            <span title="Create the header first. The tree is saved after the workflow exists.">
              Approval tree
            </span>
          ) : (
            "Approval tree"
          ),
          disabled: isCreate,
          children: tab === "tree" ? children : null,
        },
      ]}
      onChange={(next) => {
        if (next === "tree" && isCreate) {
          return;
        }
        router.push(workflowHref(employerId, workflowId, next as WorkflowDetailTab));
      }}
    />
  );
}
