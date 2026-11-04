"use client";

import { Tag } from "antd";

export function StaleStatusBadge({
  daysInState,
}: {
  daysInState: number | null | undefined;
}): React.JSX.Element | null {
  if (daysInState === undefined) {
    return null;
  }
  const label = daysInState == null ? "stuck" : `${daysInState}d in status`;
  return <Tag color="orange">{label}</Tag>;
}
