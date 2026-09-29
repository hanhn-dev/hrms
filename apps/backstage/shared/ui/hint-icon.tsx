"use client";

import { InfoCircleOutlined } from "@ant-design/icons";
import { Tooltip, theme } from "antd";

export function HintIcon({
  title,
  tone,
}: {
  title: string;
  tone: "success" | "warning";
}): React.JSX.Element {
  const { token } = theme.useToken();
  const color = tone === "warning" ? token.colorWarning : token.colorSuccess;

  return (
    <Tooltip title={title}>
      <InfoCircleOutlined aria-label={title} style={{ color }} />
    </Tooltip>
  );
}
