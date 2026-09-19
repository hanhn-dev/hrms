/** Cross-feature message contracts between popup, background, and content script. */

export const MESSAGE = {
  SCAN: "autofill/SCAN",
  FILL: "autofill/FILL",
  AUTO_TYPE: "autofill/AUTO_TYPE",
  FIELDS_UPDATED: "autofill/FIELDS_UPDATED",
  GET_SETTINGS: "autofill/GET_SETTINGS",
  SET_SETTINGS: "autofill/SET_SETTINGS",
  GET_LAST_SCAN: "autofill/GET_LAST_SCAN",
  START_PICK_SCAN: "autofill/START_PICK_SCAN",
  /** Pick a section, then scan + fill it in one pass. */
  START_PICK_FILL: "autofill/START_PICK_FILL",
  CANCEL_PICK_SCAN: "autofill/CANCEL_PICK_SCAN",
  GET_FAB_POSITION: "autofill/GET_FAB_POSITION",
  SET_FAB_POSITION: "autofill/SET_FAB_POSITION",
  /** Content → background: run MAIN-world React date fill. */
  FILL_CONTROLLED_DATE: "autofill/FILL_CONTROLLED_DATE",
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

export interface AutofillSettings {
  typingDelayMs: number;
  startWithInvalid: boolean;
}

export const DEFAULT_SETTINGS: AutofillSettings = {
  typingDelayMs: 60,
  startWithInvalid: false,
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
}

export interface FillResponse {
  ok: true;
  filledCount: number;
  skippedCount: number;
}

export interface AutoTypeRequest {
  type: typeof MESSAGE.AUTO_TYPE;
  fieldId?: string;
  /** Prefer the element under the context-menu click when available. */
  useContextTarget?: boolean;
  typingDelayMs?: number;
  startWithInvalid?: boolean;
}

export interface AutoTypeResponse {
  ok: true;
  fieldId: string;
  label: string;
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
  | { ok: true; started?: boolean; cancelled?: boolean };

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

export interface StartPickScanRequest {
  type: typeof MESSAGE.START_PICK_SCAN;
}

export interface StartPickFillRequest {
  type: typeof MESSAGE.START_PICK_FILL;
}

export interface CancelPickScanRequest {
  type: typeof MESSAGE.CANCEL_PICK_SCAN;
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

export type AutofillRequest =
  | ScanRequest
  | FillRequest
  | AutoTypeRequest
  | GetSettingsRequest
  | SetSettingsRequest
  | GetLastScanRequest
  | StartPickScanRequest
  | StartPickFillRequest
  | CancelPickScanRequest
  | GetFabPositionRequest
  | SetFabPositionRequest
  | FillControlledDateRequest;
