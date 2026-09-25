/** Cross-feature message contracts between popup, background, and content script. */

import type { PersonaId } from "@/features/personas";
import type { ScenarioId } from "@/features/scenarios";

export const MESSAGE = {
  SCAN: "autofill/SCAN",
  FILL: "autofill/FILL",
  AUTO_TYPE: "autofill/AUTO_TYPE",
  FIELDS_UPDATED: "autofill/FIELDS_UPDATED",
  GET_SETTINGS: "autofill/GET_SETTINGS",
  SET_SETTINGS: "autofill/SET_SETTINGS",
  GET_LAST_SCAN: "autofill/GET_LAST_SCAN",
  GET_LAST_FILL_REPORT: "autofill/GET_LAST_FILL_REPORT",
  START_PICK_SCAN: "autofill/START_PICK_SCAN",
  /** Pick a section, then scan + fill it in one pass. */
  START_PICK_FILL: "autofill/START_PICK_FILL",
  /** Pick a section, then keystroke-type all typeable fields. */
  START_PICK_AUTO_TYPE: "autofill/START_PICK_AUTO_TYPE",
  CANCEL_PICK_SCAN: "autofill/CANCEL_PICK_SCAN",
  /** Stop an in-progress auto-type job in every frame. */
  CANCEL_AUTO_TYPE: "autofill/CANCEL_AUTO_TYPE",
  /** Top-frame only: open or close the floating action menu. */
  TOGGLE_FLOAT_MENU: "autofill/TOGGLE_FLOAT_MENU",
  /** Top-frame only: close the floating action menu if it is open. */
  CLOSE_FLOAT_MENU: "autofill/CLOSE_FLOAT_MENU",
  GET_FAB_POSITION: "autofill/GET_FAB_POSITION",
  SET_FAB_POSITION: "autofill/SET_FAB_POSITION",
  /** Content → background: run MAIN-world React date fill. */
  FILL_CONTROLLED_DATE: "autofill/FILL_CONTROLLED_DATE",
  /** Content → background: run MAIN-world combo widget select ($find). */
  FILL_COMBO_WIDGET: "autofill/FILL_COMBO_WIDGET",
  GET_CUSTOM_HOSTS: "autofill/GET_CUSTOM_HOSTS",
  SET_CUSTOM_HOSTS: "autofill/SET_CUSTOM_HOSTS",
  /** Content → background: persist last fill report. */
  FILL_REPORT_UPDATED: "autofill/FILL_REPORT_UPDATED",
  /** Popup → background: attach the debugger and start timing requests. */
  START_NETWORK_CAPTURE: "autofill/START_NETWORK_CAPTURE",
  /** Popup → background: detach the debugger. Rows already captured stay. */
  STOP_NETWORK_CAPTURE: "autofill/STOP_NETWORK_CAPTURE",
  /** Popup → background: current rows for the active tab, slowest first. */
  GET_NETWORK_CAPTURE: "autofill/GET_NETWORK_CAPTURE",
} as const;

/** Persisted floating-action-button coordinates (CSS px). */
export interface FabPosition {
  left: number;
  top: number;
}

export type MessageType = (typeof MESSAGE)[keyof typeof MESSAGE];

export type FieldKind =
  | "text"
  | "textarea"
  | "email"
  | "phone"
  | "number"
  | "date"
  | "select"
  | "radio"
  | "unknown";

export interface ScannedField {
  id: string;
  label: string;
  kind: FieldKind;
  tagName: string;
  inputType: string;
  disabled: boolean;
  readOnly: boolean;
  maxLength: number | null;
  /** CSS selector hint for re-locating the control (best-effort). */
  selectorHint: string;
  valuePreview: string;
}

export type FillEntryStatus = "filled" | "skipped" | "failed";

export interface FillReportEntry {
  fieldId: string;
  label: string;
  kind: FieldKind;
  status: FillEntryStatus;
  reason?: string;
  valuePreview?: string;
}

export interface FillReport {
  filledCount: number;
  skippedCount: number;
  failedCount: number;
  entries: FillReportEntry[];
  personaId?: PersonaId;
  scenarioId?: ScenarioId;
  at: number;
  url?: string;
}

export interface AutofillSettings {
  typingDelayMs: number;
  startWithInvalid: boolean;
  activePersonaId: PersonaId;
  activeScenarioId: ScenarioId;
  /** When true, Fill replaces non-empty values. Default skips them. */
  overwriteExistingValues: boolean;
}

export const DEFAULT_SETTINGS: AutofillSettings = {
  typingDelayMs: 60,
  startWithInvalid: false,
  activePersonaId: "random-valid",
  activeScenarioId: "none",
  overwriteExistingValues: false,
};

export interface ScanRequest {
  type: typeof MESSAGE.SCAN;
  /** Optional CSS selector for a root element to scope the scan. */
  rootSelector?: string;
}

export interface ScanResponse {
  ok: true;
  fields: ScannedField[];
  url: string;
  /** Selector for the section chosen via pick-scan / last fill scope. */
  rootSelector?: string;
}

export interface FillRequest {
  type: typeof MESSAGE.FILL;
  /** When set, only fill these field ids; otherwise fill all fillable fields. */
  fieldIds?: string[];
  rootSelector?: string;
  /** When true, fill inside the last marked pick-scan root if present. */
  useMarkedRoot?: boolean;
  personaId?: PersonaId;
  scenarioId?: ScenarioId;
  /** When true, replace non-empty values. Default skips already-filled. */
  overwriteExistingValues?: boolean;
}

export interface FillResponse {
  ok: true;
  filledCount: number;
  skippedCount: number;
  failedCount: number;
  entries: FillReportEntry[];
}

export interface AutoTypeRequest {
  type: typeof MESSAGE.AUTO_TYPE;
  /** Single-field path (context menu / legacy). Prefer fieldIds for multi. */
  fieldId?: string;
  /** When set, keystroke-type these fields in scan order. */
  fieldIds?: string[];
  rootSelector?: string;
  /** When true, type inside the last marked pick-scan root if present. */
  useMarkedRoot?: boolean;
  /** Prefer the element under the context-menu click when available. */
  useContextTarget?: boolean;
  typingDelayMs?: number;
  startWithInvalid?: boolean;
  personaId?: PersonaId;
  /** When true, replace non-empty values. Default skips already-filled. */
  overwriteExistingValues?: boolean;
}

export interface AutoTypeResponse {
  ok: true;
  typedCount: number;
  skippedCount: number;
  failedCount: number;
  entries: FillReportEntry[];
  /** True when the user stopped the job (Esc or Stop typing). */
  cancelled?: boolean;
  /** Present when exactly one field was typed (toast convenience). */
  fieldId?: string;
  label?: string;
}

export interface ErrorResponse {
  ok: false;
  error: string;
}

export type AutofillResponse =
  | ScanResponse
  | FillResponse
  | AutoTypeResponse
  | ErrorResponse
  | {
      ok: true;
      started?: boolean;
      cancelled?: boolean;
      toggled?: boolean;
      closed?: boolean;
    };

export interface FieldsUpdatedMessage {
  type: typeof MESSAGE.FIELDS_UPDATED;
  fields: ScannedField[];
  url: string;
  rootSelector?: string;
}

export interface GetSettingsRequest {
  type: typeof MESSAGE.GET_SETTINGS;
}

export interface SetSettingsRequest {
  type: typeof MESSAGE.SET_SETTINGS;
  settings: Partial<AutofillSettings>;
}

export interface GetLastScanRequest {
  type: typeof MESSAGE.GET_LAST_SCAN;
}

export interface GetLastFillReportRequest {
  type: typeof MESSAGE.GET_LAST_FILL_REPORT;
}

export interface StartPickScanRequest {
  type: typeof MESSAGE.START_PICK_SCAN;
}

export interface StartPickFillRequest {
  type: typeof MESSAGE.START_PICK_FILL;
  personaId?: PersonaId;
  scenarioId?: ScenarioId;
  /** When true, replace non-empty values. Default skips already-filled. */
  overwriteExistingValues?: boolean;
}

export interface StartPickAutoTypeRequest {
  type: typeof MESSAGE.START_PICK_AUTO_TYPE;
  typingDelayMs?: number;
  startWithInvalid?: boolean;
  personaId?: PersonaId;
  /** When true, replace non-empty values. Default skips already-filled. */
  overwriteExistingValues?: boolean;
}

export interface CancelPickScanRequest {
  type: typeof MESSAGE.CANCEL_PICK_SCAN;
}

export interface CancelAutoTypeRequest {
  type: typeof MESSAGE.CANCEL_AUTO_TYPE;
}

export interface ToggleFloatMenuRequest {
  type: typeof MESSAGE.TOGGLE_FLOAT_MENU;
}

export interface CloseFloatMenuRequest {
  type: typeof MESSAGE.CLOSE_FLOAT_MENU;
}

export interface GetFabPositionRequest {
  type: typeof MESSAGE.GET_FAB_POSITION;
}

export interface SetFabPositionRequest {
  type: typeof MESSAGE.SET_FAB_POSITION;
  position: FabPosition;
}

export interface FillControlledDateRequest {
  type: typeof MESSAGE.FILL_CONTROLLED_DATE;
  marker: string;
  value: string;
  label?: string;
}

export interface FillComboWidgetRequest {
  type: typeof MESSAGE.FILL_COMBO_WIDGET;
  marker: string;
  preferred?: string;
}

export interface GetCustomHostsRequest {
  type: typeof MESSAGE.GET_CUSTOM_HOSTS;
}

export interface SetCustomHostsRequest {
  type: typeof MESSAGE.SET_CUSTOM_HOSTS;
  hosts: string[];
}

export interface FillReportUpdatedMessage {
  type: typeof MESSAGE.FILL_REPORT_UPDATED;
  report: FillReport;
}

/** HTTP status, a terminal failure, or null while the call is still in flight. */
export type NetworkRequestStatus = number | "failed" | "canceled" | null;

/** One captured request. Seconds are browser wall-clock, not server handler time. */
export interface NetworkTimingRow {
  requestId: string;
  url: string;
  method: string;
  resourceType: string;
  initiatorLabel: string;
  status: NetworkRequestStatus;
  cached: boolean;
  /** Total seconds from send until finish. Null while pending or if start was missed. */
  durationSeconds: number | null;
  /** Seconds until response headers, including connection setup. Null when Chrome omits timing. */
  waitingSeconds: number | null;
  /**
   * Seconds the server spent answering after the request was fully sent,
   * before response headers started. Excludes DNS, connect, TLS, and download.
   */
  handlingSeconds: number | null;
  /** Monotonic Chrome timestamp when the request was sent. Null if that event was missed. */
  startedAt: number | null;
}

export interface StartNetworkCaptureRequest {
  type: typeof MESSAGE.START_NETWORK_CAPTURE;
}

export interface StopNetworkCaptureRequest {
  type: typeof MESSAGE.STOP_NETWORK_CAPTURE;
}

export interface GetNetworkCaptureRequest {
  type: typeof MESSAGE.GET_NETWORK_CAPTURE;
}

export interface NetworkCaptureResponse {
  ok: true;
  capturing: boolean;
  rows: NetworkTimingRow[];
}

export type AutofillRequest =
  | ScanRequest
  | FillRequest
  | AutoTypeRequest
  | GetSettingsRequest
  | SetSettingsRequest
  | GetLastScanRequest
  | GetLastFillReportRequest
  | StartPickScanRequest
  | StartPickFillRequest
  | StartPickAutoTypeRequest
  | CancelPickScanRequest
  | CancelAutoTypeRequest
  | ToggleFloatMenuRequest
  | CloseFloatMenuRequest
  | GetFabPositionRequest
  | SetFabPositionRequest
  | FillControlledDateRequest
  | FillComboWidgetRequest
  | GetCustomHostsRequest
  | SetCustomHostsRequest
  | StartNetworkCaptureRequest
  | StopNetworkCaptureRequest
  | GetNetworkCaptureRequest;
