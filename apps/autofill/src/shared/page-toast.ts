import type { FillResult } from "@/features/fill";
import type { FillEntryStatus, FillReportEntry } from "@/shared/messaging";

const TOAST_ID = "form-autofill-toast";

function namedEntries(
  entries: FillReportEntry[] | undefined,
  status: FillEntryStatus,
): string {
  return (entries ?? [])
    .filter((entry) => entry.status === status)
    .map((entry) => {
      const label = entry.label.trim() || "(no label)";
      return entry.reason ? `${label} (${entry.reason})` : label;
    })
    .join(", ");
}

function countWithNames(
  count: number,
  label: string,
  names: string,
): string {
  if (count <= 0) {
    return "";
  }
  return names ? `${label} ${count}: ${names}` : `${label} ${count}`;
}

/** Count plus field names so a skip/fail is not just a number. */
export function formatFillOutcome(result: {
  filledCount: number;
  skippedCount: number;
  failedCount?: number;
  entries?: FillReportEntry[];
}): string {
  const failed = result.failedCount ?? 0;
  const parts = [
    `filled ${result.filledCount}`,
    countWithNames(
      result.skippedCount,
      "skipped",
      namedEntries(result.entries, "skipped"),
    ),
    countWithNames(failed, "failed", namedEntries(result.entries, "failed")),
  ].filter(Boolean);
  return parts.join(", ");
}

/** Brief on-page feedback so context-menu actions are not silent. */
export function showPageToast(
  message: string,
  kind: "success" | "error" | "info" = "info",
  options: { durationMs?: number } = {},
): void {
  document.getElementById(TOAST_ID)?.remove();

  const el = document.createElement("div");
  el.id = TOAST_ID;
  el.setAttribute("role", "status");
  el.textContent = message;

  const bg =
    kind === "success" ? "#1b7f3a" : kind === "error" ? "#b42318" : "#175cd3";

  Object.assign(el.style, {
    position: "fixed",
    zIndex: "2147483647",
    right: "16px",
    bottom: "16px",
    maxWidth: "480px",
    padding: "10px 14px",
    borderRadius: "8px",
    background: bg,
    color: "#fff",
    whiteSpace: "pre-wrap",
    font:
      '13px/1.4 "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
    boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
  });

  document.documentElement.appendChild(el);
  window.setTimeout(() => el.remove(), options.durationMs ?? 3500);
}

export function toastFillResult(result: FillResult): void {
  const failed = result.failedCount ?? 0;
  const outcome = formatFillOutcome(result);
  const named =
    namedEntries(result.entries, "skipped") ||
    namedEntries(result.entries, "failed");
  const durationMs = named ? 10000 : 3500;
  if (result.filledCount === 0) {
    const details = [
      countWithNames(
        result.skippedCount,
        "skipped",
        namedEntries(result.entries, "skipped"),
      ),
      countWithNames(
        failed,
        "failed",
        namedEntries(result.entries, "failed"),
      ),
    ]
      .filter(Boolean)
      .join(", ");
    showPageToast(
      `Autofill: no fields filled${details ? ` (${details})` : ""}. Open the form panel and try again.`,
      "error",
      { durationMs },
    );
    return;
  }
  showPageToast(`Autofill: ${outcome}`, failed > 0 ? "info" : "success", {
    durationMs,
  });
}

export function toastAutoTypeResult(result: {
  typedCount: number;
  skippedCount: number;
  failedCount: number;
  cancelled?: boolean;
}): void {
  if (result.cancelled) {
    showPageToast(
      `Autofill: typing cancelled (typed ${result.typedCount} field(s))`,
      "info",
    );
    return;
  }
  const failed = result.failedCount ?? 0;
  if (result.typedCount === 0) {
    showPageToast(
      `Autofill: no fields typed (skipped ${result.skippedCount}${failed ? `, failed ${failed}` : ""}).`,
      "error",
    );
    return;
  }
  const failPart = failed > 0 ? `, failed ${failed}` : "";
  const skipPart =
    result.skippedCount > 0 ? `, skipped ${result.skippedCount}` : "";
  showPageToast(
    `Autofill: typed ${result.typedCount} field(s)${skipPart}${failPart}`,
    failed > 0 ? "info" : "success",
  );
}
