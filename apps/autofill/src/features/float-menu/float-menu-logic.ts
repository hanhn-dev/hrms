import {
  DEFAULT_SETTINGS,
  MESSAGE,
  type AutofillRequest,
  type AutofillResponse,
  type AutofillSettings,
  type FabPosition,
} from "@/shared/messaging";
import { showPageToast } from "@/shared/page-toast";

export type { FabPosition };

export const ROOT_ID = "form-autofill-float-root";
export const FAB_ID = "form-autofill-float-fab";
export const MENU_ID = "form-autofill-float-menu";
export const FAB_SIZE = 48;
export const DRAG_THRESHOLD_PX = 5;

export type FloatMenuActionId =
  | "pick-scan"
  | "scan-page"
  | "pick-fill"
  | "auto-type";

export type FloatMenuIconName = "aim" | "reload" | "form" | "fontSize";

export interface FloatMenuItem {
  id: FloatMenuActionId;
  label: string;
  icon: FloatMenuIconName;
}

/** Menu items in ActionBar order (icons match popup ActionBar). */
export const FLOAT_MENU_ITEMS: readonly FloatMenuItem[] = [
  { id: "pick-scan", label: "Pick & scan", icon: "aim" },
  { id: "scan-page", label: "Scan page", icon: "reload" },
  { id: "pick-fill", label: "Pick & fill", icon: "form" },
  { id: "auto-type", label: "Pick & type", icon: "fontSize" },
] as const;

const ACTION_IDS = new Set<string>(FLOAT_MENU_ITEMS.map((item) => item.id));

/** True only in the top browsing context (one FAB for the tab). */
export function shouldMountFloatMenu(
  win: { top: Window | null; self: Window } = window,
): boolean {
  try {
    return win.top === win.self;
  } catch {
    return false;
  }
}

export function isFloatMenuActionId(
  id: string | null | undefined,
): id is FloatMenuActionId {
  return typeof id === "string" && ACTION_IDS.has(id);
}

export function buildRequestForAction(
  actionId: FloatMenuActionId,
  settings: AutofillSettings = DEFAULT_SETTINGS,
): AutofillRequest {
  switch (actionId) {
    case "pick-scan":
      return { type: MESSAGE.START_PICK_SCAN };
    case "scan-page":
      return { type: MESSAGE.SCAN };
    case "pick-fill":
      return { type: MESSAGE.START_PICK_FILL };
    case "auto-type":
      return {
        type: MESSAGE.START_PICK_AUTO_TYPE,
        typingDelayMs: settings.typingDelayMs,
        startWithInvalid: settings.startWithInvalid,
      };
  }
}

export function defaultFabPosition(
  viewportWidth: number,
  viewportHeight: number,
): FabPosition {
  return {
    left: viewportWidth - 16 - FAB_SIZE,
    top: viewportHeight - 72 - FAB_SIZE,
  };
}

export function clampFabPosition(
  pos: FabPosition,
  viewportWidth: number,
  viewportHeight: number,
  size: number = FAB_SIZE,
): FabPosition {
  const maxLeft = Math.max(0, viewportWidth - size);
  const maxTop = Math.max(0, viewportHeight - size);
  return {
    left: Math.min(Math.max(0, pos.left), maxLeft),
    top: Math.min(Math.max(0, pos.top), maxTop),
  };
}

export function isDragGesture(
  deltaX: number,
  deltaY: number,
  threshold: number = DRAG_THRESHOLD_PX,
): boolean {
  return deltaX * deltaX + deltaY * deltaY >= threshold * threshold;
}

export function normalizeFabPosition(value: unknown): FabPosition | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const parsed = value as { left?: unknown; top?: unknown };
  if (typeof parsed.left === "number" && typeof parsed.top === "number") {
    return { left: parsed.left, top: parsed.top };
  }
  return null;
}

export function resolveFabPosition(
  stored: FabPosition | null,
  viewportWidth: number,
  viewportHeight: number,
): FabPosition {
  if (stored) {
    return clampFabPosition(stored, viewportWidth, viewportHeight);
  }
  return defaultFabPosition(viewportWidth, viewportHeight);
}

export type RuntimeResponse =
  | AutofillResponse
  | { ok: true; settings: AutofillSettings }
  | { ok: true; position: FabPosition | null };

export type SendMessage = (payload: unknown) => Promise<RuntimeResponse>;

export async function defaultSendMessage(
  payload: unknown,
): Promise<RuntimeResponse> {
  return (await chrome.runtime.sendMessage(payload)) as RuntimeResponse;
}

export async function fetchPersistedFabPosition(
  send: SendMessage,
  viewportWidth: number,
  viewportHeight: number,
): Promise<FabPosition> {
  try {
    const result = await send({ type: MESSAGE.GET_FAB_POSITION });
    if (result && typeof result === "object" && "position" in result) {
      return resolveFabPosition(
        normalizeFabPosition(result.position),
        viewportWidth,
        viewportHeight,
      );
    }
  } catch {
    /* fall through to default */
  }
  return defaultFabPosition(viewportWidth, viewportHeight);
}

export async function persistFabPosition(
  send: SendMessage,
  position: FabPosition,
): Promise<void> {
  try {
    await send({ type: MESSAGE.SET_FAB_POSITION, position });
  } catch {
    /* extension context may be invalidated */
  }
}

export async function loadSettingsViaRuntime(
  send: SendMessage,
): Promise<AutofillSettings> {
  try {
    const result = await send({ type: MESSAGE.GET_SETTINGS });
    if (
      result &&
      typeof result === "object" &&
      "settings" in result &&
      result.settings
    ) {
      return { ...DEFAULT_SETTINGS, ...result.settings };
    }
  } catch {
    /* fall through to defaults */
  }
  return { ...DEFAULT_SETTINGS };
}

export function toastForResponse(
  actionId: FloatMenuActionId,
  response: AutofillResponse,
): void {
  if (!response.ok) {
    showPageToast(response.error || "Autofill action failed", "error");
    return;
  }

  if (actionId === "pick-scan") {
    if ("started" in response && response.started === true) {
      showPageToast("Click a form section to scan (Esc to cancel)", "info");
    } else {
      showPageToast("Pick mode did not start on any frame", "error");
    }
    return;
  }

  if (actionId === "pick-fill") {
    if ("started" in response && response.started === true) {
      showPageToast("Click a form section to fill (Esc to cancel)", "info");
    } else {
      showPageToast("Pick mode did not start on any frame", "error");
    }
    return;
  }

  if (actionId === "auto-type") {
    if ("started" in response && response.started === true) {
      showPageToast("Click a field to auto-type (Esc to cancel)", "info");
    } else {
      showPageToast("Pick mode did not start on any frame", "error");
    }
    return;
  }

  if (actionId === "scan-page" && "fields" in response) {
    showPageToast(`Scanned ${response.fields.length} field(s)`, "success");
  }
}

export async function executeFloatMenuAction(
  actionId: FloatMenuActionId,
  send: SendMessage,
): Promise<void> {
  const settings = await loadSettingsViaRuntime(send);
  const request = buildRequestForAction(actionId, settings);
  const response = await send(request);
  toastForResponse(actionId, response as AutofillResponse);
}
