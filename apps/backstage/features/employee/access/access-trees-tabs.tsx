"use client";

import { Tabs } from "antd";
import { MenuAccessTree } from "@/features/employee/access/menu-access-tree";
import type { AccessNode } from "@/features/employee/access/menu-tree";
import { HintIcon } from "@/shared/ui";

export function AccessTreesTabs({
  employerId,
  employmentNumber,
  tabMasterNote,
  tabMasterTone,
  tree,
  tabTree,
  writesEnabled,
}: {
  employerId: number;
  employmentNumber: string;
  tabMasterNote?: string;
  tabMasterTone?: "success" | "warning";
  tree: AccessNode[];
  tabTree: AccessNode[];
  writesEnabled: boolean;
}): React.JSX.Element {
  return (
    <Tabs
      defaultActiveKey="menu"
      items={[
        {
          key: "menu",
          label: "Left menu",
          children: (
            <MenuAccessTree
              employerId={employerId}
              employmentNumber={employmentNumber}
              tree={tree}
              writesEnabled={writesEnabled}
            />
          ),
        },
        {
          key: "tabs",
          label: (
            <span className="inline-flex items-center gap-1">
              Tab masters
              {tabMasterNote ? (
                <HintIcon
                  title={tabMasterNote}
                  tone={tabMasterTone ?? "success"}
                />
              ) : null}
            </span>
          ),
          children: (
            <MenuAccessTree
              defaultExpandAll={false}
              employerId={employerId}
              employmentNumber={employmentNumber}
              tree={tabTree}
              writesEnabled={writesEnabled}
            />
          ),
        },
      ]}
    />
  );
}
