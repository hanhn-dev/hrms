import type { FillResult } from "@/features/fill";

const TOAST_ID = "form-autofill-toast";

/** Brief on-page feedback so context-menu actions are not silent. */
export function showPageToast(
  message: string,
  kind: "success" | "error" | "info" = "info",
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
    maxWidth: "360px",
    padding: "10px 14px",
    borderRadius: "8px",
    background: bg,
    color: "#fff",
    font:
      '13px/1.4 "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
    boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
  });

  document.documentElement.appendChild(el);
  window.setTimeout(() => el.remove(), 3500);
}

export function toastFillResult(result: FillResult): void {
  if (result.filledCount === 0) {
    showPageToast(
      `Autofill: no fields filled (skipped ${result.skippedCount}). Open the form panel and try again.`,
      "error",
    );
    return;
  }
  showPageToast(
    `Autofill: filled ${result.filledCount}, skipped ${result.skippedCount}`,
    "success",
  );
}
