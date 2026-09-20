import { Tag, Typography } from "antd";
import type { FillReport, FillReportEntry } from "@/shared/messaging";

export interface FillReportPanelProps {
  report: FillReport | null;
}

function statusColor(
  status: FillReportEntry["status"],
): "success" | "default" | "error" {
  if (status === "filled") {
    return "success";
  }
  if (status === "failed") {
    return "error";
  }
  return "default";
}

export function FillReportPanel({ report }: FillReportPanelProps) {
  if (!report) {
    return (
      <Typography.Text type="secondary" className="autofill:text-xs">
        Fill a form to see which fields were filled, skipped, or failed.
      </Typography.Text>
    );
  }

  return (
    <div className="autofill:flex autofill:flex-col autofill:gap-2">
      <Typography.Text type="secondary" className="autofill:text-xs">
        Filled {report.filledCount} · skipped {report.skippedCount} · failed{" "}
        {report.failedCount}
        {report.personaId ? ` · ${report.personaId}` : ""}
        {report.scenarioId && report.scenarioId !== "none"
          ? ` · ${report.scenarioId}`
          : ""}
      </Typography.Text>
      <ul className="autofill:m-0 autofill:max-h-40 autofill:list-none autofill:overflow-auto autofill:p-0 autofill:text-xs">
        {report.entries.map((entry) => (
          <li
            key={`${entry.fieldId}-${entry.status}-${entry.label}`}
            className="autofill:mb-1 autofill:flex autofill:items-start autofill:gap-1"
          >
            <Tag
              color={statusColor(entry.status)}
              className="autofill:!m-0 autofill:!text-[10px]"
            >
              {entry.status}
            </Tag>
            <span className="autofill:min-w-0 autofill:flex-1">
              <span className="autofill:font-medium">{entry.label || "(no label)"}</span>
              {entry.reason ? (
                <span className="autofill:text-neutral-500"> — {entry.reason}</span>
              ) : null}
              {entry.valuePreview ? (
                <span className="autofill:block autofill:truncate autofill:text-neutral-400">
                  {entry.valuePreview}
                </span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
