/** Shown when attach fails because DevTools already owns the tab. */
export const DEVTOOLS_ATTACHED_ERROR =
  "Chrome DevTools is already open on this tab. Close DevTools, then start capture again.";

/**
 * Turn a `chrome.debugger.attach` rejection into a sentence for the popup.
 * Never throws — the table must keep rendering.
 */
export function debuggerAttachErrorMessage(error: unknown): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";
  if (/another debugger is already attached/i.test(raw)) {
    return DEVTOOLS_ATTACHED_ERROR;
  }
  return raw || "Could not start network capture.";
}
