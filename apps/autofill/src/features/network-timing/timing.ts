/**
 * Pure network-capture model. Chrome's debugger timestamps are monotonic
 * seconds; ResourceTiming offsets inside a response are milliseconds from
 * `requestTime`. This module never touches `chrome.*`.
 */

import type {
  NetworkRequestStatus,
  NetworkTimingRow,
} from "@/shared/messaging";

export type { NetworkRequestStatus, NetworkTimingRow };

export const MAX_CAPTURE_ROWS = 200;
/** Rows at or above this total duration are highlighted in the table. */
export const SLOW_REQUEST_SECONDS = 2;

const API_RESOURCE_TYPES = new Set(["XHR", "Fetch"]);

export interface NetworkInitiator {
  type?: string;
  url?: string;
  lineNumber?: number;
  stack?: {
    callFrames?: Array<{ url?: string; lineNumber?: number }>;
  };
}

export interface CaptureState {
  capturing: boolean;
  order: string[];
  byId: Record<string, NetworkTimingRow>;
}

export function createCaptureState(): CaptureState {
  return { capturing: true, order: [], byId: {} };
}

export function isApiResourceType(resourceType: string): boolean {
  return API_RESOURCE_TYPES.has(resourceType);
}

export function isSlowRequest(row: NetworkTimingRow): boolean {
  return (
    row.durationSeconds != null &&
    row.durationSeconds >= SLOW_REQUEST_SECONDS
  );
}

/** File name plus 1-based line. Chrome reports `lineNumber` as 0-based. */
export function formatInitiator(
  initiator: NetworkInitiator | null | undefined,
): string {
  if (!initiator?.type) {
    return "—";
  }
  if (initiator.type !== "script") {
    return initiator.type;
  }

  const frame =
    initiator.stack?.callFrames?.find((entry) => entry.url) ??
    initiator.stack?.callFrames?.[0];
  const url = frame?.url || initiator.url;
  const line = frame?.lineNumber ?? initiator.lineNumber;
  const file = url ? fileNameFromUrl(url) : "script";
  if (line == null || line < 0 || !Number.isFinite(line)) {
    return file || "script";
  }
  return `${file || "script"}:${line + 1}`;
}

export function durationSeconds(
  startedAt: number | null | undefined,
  finishedAt: number | null | undefined,
): number | null {
  if (
    startedAt == null ||
    finishedAt == null ||
    !Number.isFinite(startedAt) ||
    !Number.isFinite(finishedAt) ||
    finishedAt < startedAt
  ) {
    return null;
  }
  return roundSeconds(finishedAt - startedAt);
}

/**
 * `receiveHeadersEnd` is milliseconds after the request started.
 * `-1` means Chrome redacted the phase.
 */
export function waitingSecondsFromTiming(
  timing: { receiveHeadersEnd?: number } | null | undefined,
): number | null {
  const receiveHeadersEnd = timing?.receiveHeadersEnd;
  if (
    receiveHeadersEnd == null ||
    !Number.isFinite(receiveHeadersEnd) ||
    receiveHeadersEnd < 0
  ) {
    return null;
  }
  return roundSeconds(receiveHeadersEnd / 1000);
}

/**
 * DevTools "Waiting for server response": after the request is fully sent
 * (`sendEnd`) until response headers start (`receiveHeadersStart`).
 * Both values are milliseconds. `-1` means that phase was not recorded.
 * This is not SQL or Node CPU time; one network round trip is still included.
 */
export function handlingSecondsFromTiming(
  timing:
    | { sendEnd?: number; receiveHeadersStart?: number }
    | null
    | undefined,
): number | null {
  const sendEnd = timing?.sendEnd;
  const receiveHeadersStart = timing?.receiveHeadersStart;
  if (
    sendEnd == null ||
    receiveHeadersStart == null ||
    !Number.isFinite(sendEnd) ||
    !Number.isFinite(receiveHeadersStart) ||
    sendEnd < 0 ||
    receiveHeadersStart < 0 ||
    receiveHeadersStart < sendEnd
  ) {
    return null;
  }
  return roundSeconds((receiveHeadersStart - sendEnd) / 1000);
}

export function formatSeconds(value: number | null): string {
  if (value == null || !Number.isFinite(value)) {
    return "…";
  }
  return value.toFixed(2);
}

export function formatStatus(status: NetworkRequestStatus): string {
  if (status == null) {
    return "…";
  }
  return String(status);
}

export function formatCached(cached: boolean): string {
  return cached ? "Yes" : "—";
}

/**
 * Finished rows first, slowest first. Pending rows stay below every finished
 * row. Equal durations keep their existing order (stable sort).
 */
export function compareNetworkRows(
  left: NetworkTimingRow,
  right: NetworkTimingRow,
): number {
  const leftPending = left.durationSeconds == null;
  const rightPending = right.durationSeconds == null;
  if (leftPending && rightPending) {
    return 0;
  }
  if (leftPending) {
    return 1;
  }
  if (rightPending) {
    return -1;
  }
  if (left.durationSeconds === right.durationSeconds) {
    return 0;
  }
  return (right.durationSeconds ?? 0) - (left.durationSeconds ?? 0);
}

export function sortNetworkRows(rows: NetworkTimingRow[]): NetworkTimingRow[] {
  return [...rows].sort(compareNetworkRows);
}

export function filterNetworkRows(
  rows: NetworkTimingRow[],
  showAllTypes: boolean,
): NetworkTimingRow[] {
  if (showAllTypes) {
    return rows;
  }
  return rows.filter((row) => isApiResourceType(row.resourceType));
}

/** Case-insensitive match against URL, method, status, type, and initiator. */
export function matchesNetworkSearch(
  row: NetworkTimingRow,
  query: string,
): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return true;
  }
  const haystack = [
    row.url,
    row.method,
    row.resourceType,
    row.initiatorLabel,
    formatStatus(row.status),
    formatCached(row.cached),
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(needle);
}

export function filterNetworkRowsBySearch(
  rows: NetworkTimingRow[],
  query: string,
): NetworkTimingRow[] {
  if (!query.trim()) {
    return rows;
  }
  return rows.filter((row) => matchesNetworkSearch(row, query));
}

export function visibleNetworkRows(
  rows: NetworkTimingRow[],
  showAllTypes: boolean,
  searchQuery = "",
): NetworkTimingRow[] {
  return sortNetworkRows(
    filterNetworkRowsBySearch(filterNetworkRows(rows, showAllTypes), searchQuery),
  );
}

export function listCaptureRows(state: CaptureState | undefined): NetworkTimingRow[] {
  if (!state) {
    return [];
  }
  const rows = state.order
    .map((id) => state.byId[id])
    .filter((row): row is NetworkTimingRow => row != null);
  return sortNetworkRows(rows);
}

export function applyNetworkEvent(
  state: CaptureState,
  method: string,
  params: unknown,
): CaptureState {
  if (method === "Network.requestWillBeSent") {
    return applyRequestWillBeSent(state, params);
  }
  if (method === "Network.responseReceived") {
    return applyResponseReceived(state, params);
  }
  if (method === "Network.loadingFinished") {
    return applyLoadingFinished(state, params);
  }
  if (method === "Network.loadingFailed") {
    return applyLoadingFailed(state, params);
  }
  return state;
}

function applyRequestWillBeSent(
  state: CaptureState,
  params: unknown,
): CaptureState {
  const event = asRecord(params);
  const requestId = asString(event?.requestId);
  const startedAt = asNumber(event?.timestamp);
  if (!requestId || startedAt == null) {
    return state;
  }

  const request = asRecord(event?.request);
  const existing = state.byId[requestId];
  const initiator = event?.initiator as NetworkInitiator | undefined;
  const resourceType = asString(event?.type) || existing?.resourceType || "";

  const row: NetworkTimingRow = {
    requestId,
    url: asString(request?.url) || existing?.url || "",
    method: asString(request?.method) || existing?.method || "",
    resourceType,
    initiatorLabel: existing?.initiatorLabel ?? formatInitiator(initiator),
    status: existing?.status ?? null,
    cached: existing?.cached ?? false,
    durationSeconds: existing?.durationSeconds ?? null,
    waitingSeconds: existing?.waitingSeconds ?? null,
    handlingSeconds: existing?.handlingSeconds ?? null,
    startedAt: existing?.startedAt ?? startedAt,
  };

  return rememberRow(state, row, existing == null);
}

function applyResponseReceived(
  state: CaptureState,
  params: unknown,
): CaptureState {
  const event = asRecord(params);
  const requestId = asString(event?.requestId);
  const existing = requestId ? state.byId[requestId] : undefined;
  if (!requestId || !existing) {
    return state;
  }

  const response = asRecord(event?.response);
  const status = asNumber(response?.status);
  const timing = asRecord(response?.timing) as {
    receiveHeadersEnd?: number;
    sendEnd?: number;
    receiveHeadersStart?: number;
  } | null;
  const waiting = waitingSecondsFromTiming(timing);
  const handling = handlingSecondsFromTiming(timing);
  const resourceType = asString(event?.type) || existing.resourceType;

  return rememberRow(
    state,
    {
      ...existing,
      resourceType,
      status: status ?? existing.status,
      cached:
        typeof response?.fromDiskCache === "boolean"
          ? response.fromDiskCache
          : existing.cached,
      waitingSeconds: waiting ?? existing.waitingSeconds,
      handlingSeconds: handling ?? existing.handlingSeconds,
      url: asString(response?.url) || existing.url,
    },
    false,
  );
}

function applyLoadingFinished(
  state: CaptureState,
  params: unknown,
): CaptureState {
  const event = asRecord(params);
  const requestId = asString(event?.requestId);
  const existing = requestId ? state.byId[requestId] : undefined;
  if (!requestId || !existing?.startedAt) {
    return state;
  }
  const finishedAt = asNumber(event?.timestamp);
  const duration = durationSeconds(existing.startedAt, finishedAt);
  if (duration == null) {
    return state;
  }
  return rememberRow(
    state,
    { ...existing, durationSeconds: duration },
    false,
  );
}

function applyLoadingFailed(
  state: CaptureState,
  params: unknown,
): CaptureState {
  const event = asRecord(params);
  const requestId = asString(event?.requestId);
  const existing = requestId ? state.byId[requestId] : undefined;
  if (!requestId || !existing?.startedAt) {
    return state;
  }
  const finishedAt = asNumber(event?.timestamp);
  const duration = durationSeconds(existing.startedAt, finishedAt);
  return rememberRow(
    state,
    {
      ...existing,
      status: event?.canceled === true ? "canceled" : "failed",
      durationSeconds: duration ?? existing.durationSeconds,
    },
    false,
  );
}

function rememberRow(
  state: CaptureState,
  row: NetworkTimingRow,
  isNew: boolean,
): CaptureState {
  let order = isNew ? [...state.order, row.requestId] : state.order;
  let byId: Record<string, NetworkTimingRow> = {
    ...state.byId,
    [row.requestId]: row,
  };

  if (isNew && order.length > MAX_CAPTURE_ROWS) {
    const dropped = order[0];
    order = order.slice(1);
    if (dropped && dropped !== row.requestId) {
      const next = { ...byId };
      delete next[dropped];
      byId = next;
    }
  }

  return { ...state, order, byId };
}

function roundSeconds(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function fileNameFromUrl(url: string): string {
  const path = url.split("?")[0]?.split("#")[0] ?? url;
  const parts = path.split("/");
  return parts[parts.length - 1] || url;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value == null || typeof value !== "object") {
    return null;
  }
  return value as Record<string, unknown>;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
