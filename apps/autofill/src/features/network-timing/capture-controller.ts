import { DISALLOWED_PAGE_ERROR } from "@/shared/allowed-hosts";
import { debuggerAttachErrorMessage } from "./debugger-error";
import {
  applyNetworkEvent,
  createCaptureState,
  listCaptureRows,
  type CaptureState,
  type NetworkTimingRow,
} from "./timing";

const DEBUGGER_PROTOCOL_VERSION = "1.3";

export interface NetworkCaptureSnapshot {
  ok: true;
  capturing: boolean;
  rows: NetworkTimingRow[];
}

export interface NetworkCaptureFailure {
  ok: false;
  error: string;
}

/** In-memory only. A service-worker restart drops the list on purpose. */
const captures = new Map<number, CaptureState>();

/**
 * `detach()` we initiate (restart / stop) also fires `onDetach`. Ignore those
 * so a deliberate restart is not treated as the user cancelling the infobar.
 */
const suppressDetach = new Map<number, number>();

function pushSuppressDetach(tabId: number): void {
  suppressDetach.set(tabId, (suppressDetach.get(tabId) ?? 0) + 1);
}

function popSuppressDetach(tabId: number): void {
  const next = (suppressDetach.get(tabId) ?? 1) - 1;
  if (next <= 0) {
    suppressDetach.delete(tabId);
  } else {
    suppressDetach.set(tabId, next);
  }
}

/**
 * Register at service-worker startup. Listeners added later are dropped when
 * the worker sleeps, and events that arrived while the popup was closed
 * would be lost.
 */
export function bindNetworkCaptureListeners(): void {
  chrome.debugger.onEvent.addListener((source, method, params) => {
    const tabId = source.tabId;
    if (tabId == null) {
      return;
    }
    const state = captures.get(tabId);
    if (!state?.capturing) {
      return;
    }
    captures.set(tabId, applyNetworkEvent(state, method, params));
  });

  chrome.debugger.onDetach.addListener((source) => {
    const tabId = source.tabId;
    if (tabId == null) {
      return;
    }
    if ((suppressDetach.get(tabId) ?? 0) > 0) {
      return;
    }
    const state = captures.get(tabId);
    if (!state) {
      return;
    }
    captures.set(tabId, { ...state, capturing: false });
  });

  chrome.tabs.onRemoved.addListener((tabId) => {
    captures.delete(tabId);
  });
}

export function getNetworkCapture(tabId: number): NetworkCaptureSnapshot {
  const state = captures.get(tabId);
  return {
    ok: true,
    capturing: state?.capturing ?? false,
    rows: listCaptureRows(state),
  };
}

export async function startNetworkCapture(
  tabId: number,
  allowed: boolean,
): Promise<NetworkCaptureSnapshot | NetworkCaptureFailure> {
  if (!allowed) {
    return { ok: false, error: DISALLOWED_PAGE_ERROR };
  }

  const previous = captures.get(tabId);
  if (previous?.capturing) {
    captures.set(tabId, createCaptureState());
    return { ok: true, capturing: true, rows: [] };
  }

  pushSuppressDetach(tabId);
  let attached = false;
  try {
    try {
      await chrome.debugger.detach({ tabId });
    } catch {
      // Not attached yet.
    }
    await chrome.debugger.attach({ tabId }, DEBUGGER_PROTOCOL_VERSION);
    attached = true;
    await chrome.debugger.sendCommand({ tabId }, "Network.enable");
  } catch (error) {
    if (attached) {
      try {
        await chrome.debugger.detach({ tabId });
      } catch {
        // Detach failed; the infobar may remain until the user cancels it.
      }
    }
    popSuppressDetach(tabId);
    if (previous) {
      captures.set(tabId, { ...previous, capturing: false });
    }
    return { ok: false, error: debuggerAttachErrorMessage(error) };
  }

  captures.set(tabId, createCaptureState());
  // Detach events from the cleanup above can arrive after `detach()` resolves.
  queueMicrotask(() => popSuppressDetach(tabId));
  return { ok: true, capturing: true, rows: [] };
}

export async function stopNetworkCapture(
  tabId: number,
): Promise<NetworkCaptureSnapshot> {
  pushSuppressDetach(tabId);
  try {
    await chrome.debugger.detach({ tabId });
  } catch {
    // Not attached.
  } finally {
    popSuppressDetach(tabId);
  }
  const state = captures.get(tabId);
  if (state) {
    captures.set(tabId, { ...state, capturing: false });
  }
  return getNetworkCapture(tabId);
}
