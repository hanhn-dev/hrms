import {
  MESSAGE,
  type AutofillRequest,
  type AutofillResponse,
  type AutoTypeRequest,
  type FieldsUpdatedMessage,
  type FillRequest,
  type ScanRequest,
  type ScannedField,
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
import { mountFloatMenu } from "@/features/float-menu";

/** Last element under a context-menu click. */
let lastContextTarget: Element | null = null;
let lastRootSelector: string | undefined;

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
async function handleStartPickFill(): Promise<AutofillResponse> {
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
    const fillResult = await fillFields({ root });
    toastFillResult(fillResult);
    const fields = scanFields({ root });
    notifyFieldsUpdated(fields, result.rootSelector);
  })();

  showPageToast(
    "Click a form section in this frame to fill (Esc to cancel)",
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
  });
  toastFillResult(result);
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

  if (!field && fields.length > 0) {
    field = fields.find((f) => !f.disabled && !f.readOnly) ?? fields[0];
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

export async function dispatchAutofillMessage(
  message: AutofillRequest,
): Promise<AutofillResponse> {
  switch (message.type) {
    case MESSAGE.SCAN:
      return handleScan(message);
    case MESSAGE.START_PICK_SCAN:
      return handleStartPickScan();
    case MESSAGE.START_PICK_FILL:
      return handleStartPickFill();
    case MESSAGE.CANCEL_PICK_SCAN:
      return handleCancelPickScan();
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
  __FORM_AUTOFILL__?: { dispatch: typeof dispatchAutofillMessage };
};

function startContentScript(): void {
  const host = globalThis as ContentScriptHost;
  if (host.__FORM_AUTOFILL__) {
    // executeScript can re-run this file; do not remount UI or stack listeners.
    host.__FORM_AUTOFILL__.dispatch = dispatchAutofillMessage;
    return;
  }

  trackContextTarget();
  mountFloatMenu();
  host.__FORM_AUTOFILL__ = { dispatch: dispatchAutofillMessage };

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

startContentScript();
