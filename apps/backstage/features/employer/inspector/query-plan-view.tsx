"use client";

import { useEffect, useRef, useState } from "react";
import { Alert, Button, Space, Typography } from "antd";
import { renderShowplan } from "@hrms/showplan";
import iconSheet from "./qp_icons.png";

const iconUrl = typeof iconSheet === "string" ? iconSheet : iconSheet.src;

function plansToDraw(plans: readonly string[]): string[] {
  const visible = plans.filter((xml) => !xml.includes("__hrms_rc"));
  return visible.length > 0 ? visible : [...plans];
}

function PlanCanvas({ xml }: { xml: string }): React.JSX.Element {
  const host = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const container = host.current;
    if (!container) {
      return;
    }
    try {
      renderShowplan(container, xml, { iconSheet: iconUrl });
      setError(null);
    } catch (cause: unknown) {
      setError(
        cause instanceof Error ? cause.message : "The plan could not be drawn.",
      );
    }
    return () => {
      container.replaceChildren();
    };
  }, [xml]);

  return (
    <div className="overflow-x-auto bg-white">
      {error ? <Alert title={error} type="warning" /> : null}
      <div ref={host} />
    </div>
  );
}

export function ExecutionPlanDiagrams({
  plans,
}: {
  plans: readonly string[];
}): React.JSX.Element {
  const diagrams = plansToDraw(plans);
  return (
    <Space className="w-full" orientation="vertical" size="small">
      <Space>
        <Typography.Text strong>Execution plan</Typography.Text>
        <Button
          size="small"
          onClick={() => {
            void navigator.clipboard.writeText(diagrams.join("\n"));
          }}
        >
          Copy XML
        </Button>
      </Space>
      {diagrams.map((xml, index) => (
        <PlanCanvas key={`${index}-${xml.length}`} xml={xml} />
      ))}
    </Space>
  );
}
