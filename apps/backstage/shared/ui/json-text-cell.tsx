"use client";

import { Button, Tooltip } from "antd";

export function JsonTextCell({
  value,
  onClick,
}: {
  value: string | null;
  onClick?: () => void;
}): React.JSX.Element {
  const label = value?.trim() ? value : "—";
  const truncated = (
    <span className="inline-block max-w-52 truncate align-bottom">{label}</span>
  );

  if (!onClick) {
    return value?.trim() ? <Tooltip title={value}>{truncated}</Tooltip> : <span>—</span>;
  }

  return (
    <Tooltip title={value?.trim() ? value : "Open JSON"}>
      <Button
        className="h-auto max-w-52 p-0 align-bottom"
        type="link"
        onClick={onClick}
      >
        <span className="inline-block max-w-52 truncate">{label}</span>
      </Button>
    </Tooltip>
  );
}
