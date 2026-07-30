import type React from "react";
import { Alert } from "antd";

export function SaveStatus({
  saveStatus,
  errorMessage,
}: {
  saveStatus: "idle" | "saving" | "saved" | "error";
  errorMessage: string | null;
}): React.JSX.Element {
  if (saveStatus === "idle") {
    return <Alert type="info" showIcon title="Draft not saved yet" />;
  }

  if (saveStatus === "saving") {
    return <Alert type="info" showIcon title="Saving draft..." />;
  }

  if (saveStatus === "saved") {
    return <Alert type="success" showIcon title="Draft saved locally" />;
  }

  return <Alert type="error" showIcon title={errorMessage ?? "Saving failed"} />;
}