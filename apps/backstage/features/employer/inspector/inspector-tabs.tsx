"use client";

import { useState } from "react";
import { Card } from "antd";
import type { InspectorEmployer } from "@/features/employer/inspector/queries";
import { ScriptPanel } from "@/features/employer/inspector/script-panel";
import { ValueSearchPanel } from "@/features/employer/inspector/value-search-panel";

export function InspectorTabs({
  routeEmployerId,
  employers,
  writesEnabled,
}: {
  routeEmployerId: number;
  employers: InspectorEmployer[];
  writesEnabled: boolean;
}): React.JSX.Element {
  const [tab, setTab] = useState("value");

  return (
    <Card
      activeTabKey={tab}
      tabList={[
        { key: "value", label: "Find a value" },
        { key: "script", label: "Object script" },
      ]}
      onTabChange={setTab}
    >
      <div className={tab === "value" ? undefined : "hidden"}>
        <ValueSearchPanel
          routeEmployerId={routeEmployerId}
          employers={employers}
        />
      </div>
      <div className={tab === "script" ? undefined : "hidden"}>
        <ScriptPanel writesEnabled={writesEnabled} />
      </div>
    </Card>
  );
}
