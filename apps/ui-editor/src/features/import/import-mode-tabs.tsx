import type React from "react";
import { Tabs } from "antd";

export type ImportMode = "html" | "image";

export function ImportModeTabs({
  activeMode,
  onChange,
  htmlPanel,
  screenshotPanel,
}: {
  activeMode: ImportMode;
  onChange: (mode: ImportMode) => void;
  htmlPanel: React.ReactNode;
  screenshotPanel: React.ReactNode;
}): React.JSX.Element {
  return (
    <Tabs
      activeKey={activeMode}
      onChange={(value) => onChange(value as ImportMode)}
      items={[
        {
          key: "html",
          label: "HTML Snapshot",
          children: htmlPanel,
        },
        {
          key: "image",
          label: "Screenshot",
          children: screenshotPanel,
        },
      ]}
    />
  );
}