import { MESSAGE } from "@/shared/messaging";

/**
 * Re-injecting CRXJS content scripts (`chrome.scripting.executeScript({ files })`)
 * on an already-loaded tab flashes or fully reloads the page (Vite HMR client).
 */
export function needsContentScriptInject(readyFrameCount: number): boolean {
  return !Number.isFinite(readyFrameCount) || readyFrameCount < 1;
}

/**
 * Probe/inject only for pick + scan (+ pick-fill). Instant FILL must not run
 * executeScript({ files }) or a readiness probe first — that flashes the live tab.
 */
export function shouldPrepareContentScripts(messageType: string): boolean {
  return (
    messageType === MESSAGE.START_PICK_SCAN ||
    messageType === MESSAGE.START_PICK_FILL ||
    messageType === MESSAGE.SCAN
  );
}

