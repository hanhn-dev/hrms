"use client";

import { useState } from "react";
import { InfoCircleOutlined } from "@ant-design/icons";
import { Card, Tooltip } from "antd";
import type { InspectorEmployer } from "@/features/employer/inspector/queries";
import { ScriptPanel } from "@/features/employer/inspector/script-panel";
import { ValueSearchPanel } from "@/features/employer/inspector/value-search-panel";

const SCRIPT_HELP =
  "Scripts are database-wide and ignore the employer filter. The script opens formatted. Violet names are input parameters, rose names are locals, cyan names are table aliases, amber values are numbers, and bold dark pink names are SQL Server built-ins such as CAST, STRING_AGG, and sp_help. Click a name to jump to its declaration. Object chips use the studio colors: blue tables, orange procedures, cyan functions, purple views. The list beside the script groups those objects and names. View script opens another tab. Execute asks for parameters and shows the result in the same window. Ctrl+Tab and Ctrl+Shift+Tab move between tabs. Ctrl+W closes the current tab.";

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
        {
          key: "script",
          label: (
            <span className="inline-flex items-center gap-1">
              Object script
              <Tooltip
                title={SCRIPT_HELP}
                styles={{ root: { maxWidth: 440 }, container: { maxWidth: 440 } }}
              >
                <InfoCircleOutlined aria-label="About object scripts" />
              </Tooltip>
            </span>
          ),
        },
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
