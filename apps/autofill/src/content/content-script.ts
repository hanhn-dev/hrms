import {
  MESSAGE,
  type AutofillRequest,
  type AutofillResponse,
  type AutoTypeRequest,
  type FieldsUpdatedMessage,
  type FillRequest,
  type FillReport,
  type ScanRequest,
  type ScannedField,
  type StartPickAutoTypeRequest,
  type StartPickFillRequest,
} from "@/shared/messaging";
import { showPageToast, toastFillResult } from "@/shared/page-toast";
import {
  scanFields,
  resolveScanRoot,
  findElementForField,
  getMarkedScanRoot,
  countFillableControls,
} from "@/features/scan";
import { fillFields } from "@/features/fill";
import { autoTypeField } from "@/features/auto-type";
import {
  startElementPicker,
  cancelElementPicker,
} from "@/features/pick-scan";
import { mountFloatMenu, type FloatMenuActionId, type FloatMenuController } from "@/features/float-menu";
import {
  defaultSendMessage,
  executeFloatMenuAction,
} from "@/features/float-menu/float-menu-logic";
import { bindPageShortcuts } from "@/features/shortcuts";
import { isAllowedPageUrl } from "@/shared/allowed-hosts";
import type { PersonaId } from "@/features/personas";
import type { ScenarioId } from "@/features/scenarios";

/** Last element under a context-menu click. */
let lastContextTarget: Element | null = null;
let lastRootSelector: string | undefined;
/** Extra hosts from SW (customer UAT). Refreshed on start. */
let extraAllowedHosts: string[] = [];

function trackContextTarget(): void {
  document.addEventListener(
    "contextmenu",
    (event) => {
      lastContextTarget = event.target as Element | null;
    },
    true,
  );
}

function scopeRootFromTarget(target: Element | null): ParentNode {
  const marked = getMarkedScanRoot();
  if (marked) {
    return marked;
  }

  if (!target || !(target instanceof Element)) {
    return document;
  }

  const candidates: Element[] = [];
  const form = target.closest("form");
  if (form) {
    candidates.push(form);
  }
  const dialog =
    target.closest(".MuiDialog-root") ||
    target.closest('[role="dialog"]') ||
    target.closest(".MuiDrawer-root");
  if (dialog) {
    candidates.push(dialog);
  }

  let node: Element | null = target;
  while (node) {
    const cls = typeof node.className === "string" ? node.className : "";
    if (cls.includes("space-y")) {
      candidates.push(node);
    }
    node = node.parentElement;
  }

  for (const candidate of candidates) {
    const count = candidate.querySelectorAll(
      "input:not([type='hidden']):not([type='submit']):not([type='button']), textarea, select",
    ).length;
    if (count >= 2) {
      return candidate;
    }
  }

  return document;
}

function notifyFieldsUpdated(
  fields: ScannedField[],
  rootSelector?: string,
): void {
  const update: FieldsUpdatedMessage = {
    type: MESSAGE.FIELDS_UPDATED,
    fields,
    url: location.href,
    rootSelector,
  };
  chrome.runtime.sendMessage(update).catch(() => {
    /* service worker may be asleep momentarily */
  });
}

function notifyFillReport(
  result: {
    filledCount: number;
    skippedCount: number;
    failedCount: number;
    entries: FillReport["entries"];
  },
  personaId?: PersonaId | null,
  scenarioId?: ScenarioId | null,
): void {
  const report: FillReport = {
    filledCount: result.filledCount,
    skippedCount: result.skippedCount,
    failedCount: result.failedCount,
    entries: result.entries,
    personaId: personaId ?? undefined,
    scenarioId: scenarioId ?? undefined,
    at: Date.now(),
    url: location.href,
  };
  chrome.runtime
    .sendMessage({ type: MESSAGE.FILL_REPORT_UPDATED, report })
    .catch(() => {
      /* ignore */
    });
}

async function handleScan(request: ScanRequest): Promise<AutofillResponse> {
  const root = resolveScanRoot(request.rootSelector);
  const fields = scanFields({ root });
  notifyFieldsUpdated(fields, request.rootSelector);
  return {
    ok: true,
    fields,
    url: location.href,
    rootSelector: request.rootSelector,
  };
}

async function handleStartPickScan(): Promise<AutofillResponse> {
  // Skip empty frames (chrome chrome, trackers) — the form iframe still gets a picker.
  if (countFillableControls(document) === 0) {
    return { ok: true, started: false };
  }

  // Return immediately so the popup can close; pick continues asynchronously.
  void (async () => {
    const result = await startElementPicker();
    if (!result) {
      return;
    }
    lastRootSelector = result.rootSelector;
    notifyFieldsUpdated(result.fields, result.rootSelector);
    // Stop pick overlays in sibling frames (top page + other iframes)
    chrome.runtime.sendMessage({ type: MESSAGE.CANCEL_PICK_SCAN }).catch(() => {
      /* ignore */
    });
  })();

  showPageToast(
    "Click a form section in this frame to scan (Esc to cancel)",
    "info",
  );
  return { ok: true, started: true };
}

/**
 * Inspector pick like Pick & scan, then immediately fill the chosen section.
 */
async function handleStartPickFill(
  request: StartPickFillRequest,
): Promise<AutofillResponse> {
  if (countFillableControls(document) === 0) {
    return { ok: true, started: false };
  }

  void (async () => {
    const result = await startElementPicker();
    if (!result) {
      return;
    }
    lastRootSelector = result.rootSelector;
    notifyFieldsUpdated(result.fields, result.rootSelector);
    chrome.runtime.sendMessage({ type: MESSAGE.CANCEL_PICK_SCAN }).catch(() => {
      /* ignore */
    });

    const root = getMarkedScanRoot() ?? resolveScanRoot(result.rootSelector);
    const fillResult = await fillFields({
      root,
      personaId: request.personaId,
      scenarioId: request.scenarioId,
    });
    toastFillResult(fillResult);
    notifyFillReport(fillResult, request.personaId, request.scenarioId);
    const fields = scanFields({ root });
    notifyFieldsUpdated(fields, result.rootSelector);
  })();

  showPageToast(
    "Click a form section in this frame to fill (Esc to cancel)",
    "info",
  );
  return { ok: true, started: true };
}

/**
 * Inspector pick a single control, then keystroke-type into it.
 */
async function handleStartPickAutoType(
  request: StartPickAutoTypeRequest,
): Promise<AutofillResponse> {
  if (countFillableControls(document) === 0) {
    return { ok: true, started: false };
  }

  void (async () => {
    const result = await startElementPicker({
      mode: "control",
      bannerText: "Click the field to auto-type · Esc cancels",
      announceScan: false,
    });
    if (!result?.element) {
      return;
    }
    lastRootSelector = result.rootSelector;
    notifyFieldsUpdated(result.fields, result.rootSelector);
    chrome.runtime.sendMessage({ type: MESSAGE.CANCEL_PICK_SCAN }).catch(() => {
      /* ignore */
    });

    const field = result.fields[0];
    if (!field) {
      showPageToast("Autofill: no editable field found for auto-type", "error");
      return;
    }

    try {
      const typed = await autoTypeField({
        field,
        element: result.element,
        typingDelayMs: request.typingDelayMs,
        startWithInvalid: request.startWithInvalid,
      });
      showPageToast(`Autofill: typed into ${typed.label}`, "success");
    } catch (error) {
      const messageText =
        error instanceof Error ? error.message : "Auto-type failed";
      showPageToast(`Autofill: ${messageText}`, "error");
    }
  })();

  showPageToast(
    "Click a field in this frame to auto-type (Esc to cancel)",
    "info",
  );
  return { ok: true, started: true };
}

async function handleCancelPickScan(): Promise<AutofillResponse> {
  cancelElementPicker();
  return { ok: true, cancelled: true };
}

async function handleFill(request: FillRequest): Promise<AutofillResponse> {
  let root: ParentNode = document;

  if (request.rootSelector) {
    root = resolveScanRoot(request.rootSelector);
  } else if (request.useMarkedRoot !== false) {
    const marked = getMarkedScanRoot();
    if (marked) {
      root = marked;
    } else if (lastRootSelector) {
      root = resolveScanRoot(lastRootSelector);
    } else {
      root = scopeRootFromTarget(lastContextTarget);
    }
  } else {
    root = scopeRootFromTarget(lastContextTarget);
  }

  const result = await fillFields({
    root,
    fieldIds: request.fieldIds,
    personaId: request.personaId,
    scenarioId: request.scenarioId,
  });
  toastFillResult(result);
  notifyFillReport(result, request.personaId, request.scenarioId);
  const fields = scanFields({ root });
  notifyFieldsUpdated(fields, lastRootSelector);
  return { ok: true, ...result };
}

async function handleAutoType(
  request: AutoTypeRequest,
): Promise<AutofillResponse> {
  const root = scopeRootFromTarget(lastContextTarget);
  const fields = scanFields({ root });

  let field: ScannedField | undefined;
  let element:
    | HTMLInputElement
    | HTMLTextAreaElement
    | HTMLSelectElement
    | null = null;

  if (request.useContextTarget && lastContextTarget) {
    const editable = lastContextTarget.closest(
      "input, textarea",
    ) as HTMLInputElement | HTMLTextAreaElement | null;
    if (editable) {
      element = editable;
      field = fields.find((f) => {
        const el = findElementForField(f, root);
        return el === editable;
      }) ?? {
        id: editable.id || "context-target",
        label:
          editable.getAttribute("aria-label") ||
          editable.placeholder ||
          "Field",
        kind: "text",
        tagName: editable.tagName.toLowerCase(),
        inputType:
          editable instanceof HTMLInputElement
            ? editable.type || "text"
            : "textarea",
        disabled: editable.disabled,
        readOnly: editable.readOnly,
        maxLength: editable.maxLength > 0 ? editable.maxLength : null,
        selectorHint: editable.id ? `#${CSS.escape(editable.id)}` : "input",
        valuePreview: editable.value.slice(0, 40),
      };
    }
  }

  if (!field && request.fieldId) {
    field = fields.find((f) => f.id === request.fieldId);
  }

  if (!field) {
    showPageToast("Autofill: no editable field found for auto-type", "error");
    return { ok: false, error: "No editable field found for auto-type" };
  }

  const result = await autoTypeField({
    field,
    root,
    element,
    typingDelayMs: request.typingDelayMs,
    startWithInvalid: request.startWithInvalid,
  });

  showPageToast(`Autofill: typed into ${result.label}`, "success");
  return { ok: true, ...result };
}

async function handleToggleFloatMenu(): Promise<AutofillResponse> {
  const host = globalThis as ContentScriptHost;
  const toggled = host.__FORM_AUTOFILL__?.toggleMenu?.() === true;
  if (!toggled) {
    return { ok: true, started: false };
  }
  return { ok: true, toggled: true };
}

async function handleCloseFloatMenu(): Promise<AutofillResponse> {
  const host = globalThis as ContentScriptHost;
  const closed = host.__FORM_AUTOFILL__?.closeMenu?.() === true;
  return { ok: true, closed };
}

export async function dispatchAutofillMessage(
  message: AutofillRequest,
): Promise<AutofillResponse> {
  switch (message.type) {
    case MESSAGE.SCAN:
      return handleScan(message);
    case MESSAGE.START_PICK_SCAN:
      return handleStartPickScan();
    case MESSAGE.START_PICK_FILL:
      return handleStartPickFill(message);
    case MESSAGE.START_PICK_AUTO_TYPE:
      return handleStartPickAutoType(message);
    case MESSAGE.CANCEL_PICK_SCAN:
      return handleCancelPickScan();
    case MESSAGE.TOGGLE_FLOAT_MENU:
      return handleToggleFloatMenu();
    case MESSAGE.CLOSE_FLOAT_MENU:
      return handleCloseFloatMenu();
    case MESSAGE.FILL:
      return handleFill(message);
    case MESSAGE.AUTO_TYPE:
      return handleAutoType(message);
    default:
      return {
        ok: false,
        error: `Unknown message: ${(message as { type: string }).type}`,
      };
  }
}

type ContentScriptHost = typeof globalThis & {
  __FORM_AUTOFILL__?: {
    dispatch: typeof dispatchAutofillMessage;
    toggleMenu?: () => boolean;
    closeMenu?: () => boolean;
    runAction?: (actionId: FloatMenuActionId) => Promise<void>;
  };
};

async function loadExtraHosts(): Promise<string[]> {
  try {
    const result = (await chrome.runtime.sendMessage({
      type: MESSAGE.GET_CUSTOM_HOSTS,
    })) as { ok?: boolean; hosts?: string[] };
    if (result?.ok && Array.isArray(result.hosts)) {
      return result.hosts;
    }
  } catch {
    /* SW may be waking */
  }
  return [];
}

function mountContentRuntime(): void {
  const host = globalThis as ContentScriptHost;
  if (host.__FORM_AUTOFILL__) {
    // executeScript can re-run this file; do not remount UI or stack listeners.
    host.__FORM_AUTOFILL__.dispatch = dispatchAutofillMessage;
    return;
  }

  trackContextTarget();
  const floatMenu: FloatMenuController | null = mountFloatMenu();
  host.__FORM_AUTOFILL__ = {
    dispatch: dispatchAutofillMessage,
    toggleMenu: () => {
      if (!floatMenu) {
        return false;
      }
      floatMenu.setOpen(!floatMenu.open);
      return true;
    },
    closeMenu: () => {
      if (!floatMenu?.open) {
        return false;
      }
      floatMenu.setOpen(false);
      return true;
    },
    runAction: async (actionId) => {
      if (floatMenu) {
        await floatMenu.runAction(actionId);
        return;
      }
      await executeFloatMenuAction(actionId, defaultSendMessage);
    },
  };

  bindPageShortcuts({
    onAction: (actionId) => {
      void host.__FORM_AUTOFILL__?.runAction?.(actionId);
    },
    onToggleMenu: () => {
      const toggled = host.__FORM_AUTOFILL__?.toggleMenu?.() === true;
      if (!toggled) {
        // Nested frames have no FAB; ask the top frame via the service worker.
        void chrome.runtime.sendMessage({ type: MESSAGE.TOGGLE_FLOAT_MENU });
      }
    },
    onEscape: (event) => {
      const closed = host.__FORM_AUTOFILL__?.closeMenu?.() === true;
      if (closed) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (!floatMenu) {
        // Nested frames never mount the FAB; close the top-frame menu if open.
        void chrome.runtime.sendMessage({ type: MESSAGE.CLOSE_FLOAT_MENU });
      }
    },
  });

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    void dispatchAutofillMessage(message as AutofillRequest)
      .then(sendResponse)
      .catch((error: unknown) => {
        const messageText =
          error instanceof Error ? error.message : String(error);
        sendResponse({ ok: false, error: messageText });
      });
    return true;
  });
}

function startContentScript(): void {
  // Sync path for default hosts (manifest-injected).
  if (isAllowedPageUrl(location.href, extraAllowedHosts)) {
    mountContentRuntime();
    return;
  }

  // Custom UAT hosts: resolve allowlist from SW, then mount if permitted.
  void loadExtraHosts().then((hosts) => {
    extraAllowedHosts = hosts;
    if (isAllowedPageUrl(location.href, extraAllowedHosts)) {
      mountContentRuntime();
    }
  });
}

startContentScript();
