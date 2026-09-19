import {
  MESSAGE,
  type AutofillRequest,
  type AutofillResponse,
  type FieldsUpdatedMessage,
  type FillControlledDateRequest,
} from "@/shared/messaging";
import {
  loadFabPosition,
  loadLastScan,
  loadSettings,
  saveFabPosition,
  saveLastScan,
  saveSettings,
} from "@/shared/storage";
import {
  MENU_IDS,
  createContextMenus,
  isAutofillMenuId,
} from "@/features/context-menu";
import {
  fillControlledDateMainWorld,
  type MainWorldFillResult,
} from "@/features/fill/page-world";
import { needsContentScriptInject, shouldPrepareContentScripts } from "./content-inject";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function ensureContentScripts(tabId: number): Promise<void> {
  const manifest = chrome.runtime.getManifest();
  const files = manifest.content_scripts?.[0]?.js;
  if (!files?.length) {
    return;
  }
  try {
    await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      files,
    });
  } catch {
    // Restricted pages cannot be injected
  }
}

/** CRXJS loaders import the real bundle asynchronously — wait until the API exists. */
async function waitForContentApi(
  tabId: number,
  frameIds?: number[],
  attempts = 25,
): Promise<number> {
  const target: chrome.scripting.InjectionTarget =
    frameIds && frameIds.length > 0
      ? { tabId, frameIds }
      : { tabId, allFrames: true };

  for (let i = 0; i < attempts; i += 1) {
    try {
      const results = await chrome.scripting.executeScript({
        target,
        world: "ISOLATED",
        func: () =>
          Boolean(
            (
              globalThis as typeof globalThis & {
                __FORM_AUTOFILL__?: { dispatch?: unknown };
              }
            ).__FORM_AUTOFILL__?.dispatch,
          ),
      });
      const readyCount = results.filter((r) => r.result === true).length;
      if (readyCount > 0) {
        return readyCount;
      }
    } catch {
      // tab/frame may not be injectable yet
    }
    await sleep(100);
  }
  return 0;
}

async function dispatchViaExecuteScript(
  tabId: number,
  message: AutofillRequest,
  frameIds?: number[],
): Promise<AutofillResponse[]> {
  const target: chrome.scripting.InjectionTarget =
    frameIds && frameIds.length > 0
      ? { tabId, frameIds }
      : { tabId, allFrames: true };

  const results = await chrome.scripting.executeScript({
    target,
    world: "ISOLATED",
    func: async (payload: AutofillRequest) => {
      const api = (
        globalThis as typeof globalThis & {
          __FORM_AUTOFILL__?: {
            dispatch: (m: AutofillRequest) => Promise<AutofillResponse>;
          };
        }
      ).__FORM_AUTOFILL__;
      if (!api?.dispatch) {
        return {
          ok: false,
          error: "Content script not ready",
        } as AutofillResponse;
      }
      return api.dispatch(payload);
    },
    args: [message],
  });

  return results
    .map((r) => r.result as AutofillResponse | undefined)
    .filter((r): r is AutofillResponse => Boolean(r));
}

function pickBestResponse(
  responses: AutofillResponse[],
  messageType: string,
): AutofillResponse {
  const withFills = responses.filter(
    (r) => r.ok && "filledCount" in r && typeof r.filledCount === "number",
  );
  if (withFills.length > 0) {
    return withFills.reduce((best, cur) =>
      (cur as { filledCount: number }).filledCount >
      (best as { filledCount: number }).filledCount
        ? cur
        : best,
    );
  }

  const withFields = responses.filter(
    (r) => r.ok && "fields" in r && Array.isArray(r.fields),
  );
  if (withFields.length > 0) {
    return withFields.reduce((best, cur) =>
      (cur as { fields: unknown[] }).fields.length >
      (best as { fields: unknown[] }).fields.length
        ? cur
        : best,
    );
  }

  const started = responses.filter(
    (r) => r.ok && "started" in r && r.started === true,
  );
  if (started.length > 0) {
    return started[0]!;
  }

  if (
    messageType === MESSAGE.START_PICK_SCAN ||
    messageType === MESSAGE.START_PICK_FILL
  ) {
    const notReady = responses.some(
      (r) => !r.ok && r.error === "Content script not ready",
    );
    const isFill = messageType === MESSAGE.START_PICK_FILL;
    const actionLabel = isFill ? "Pick & fill" : "Pick & scan";
    return {
      ok: false,
      error: notReady
        ? `Content script not ready. Refresh the page, then try ${actionLabel} again.`
        : `No frame with form fields accepted ${actionLabel}. Click inside the form iframe and try again.`,
    };
  }

  const cancelled = responses.find(
    (r) => r.ok && "cancelled" in r && r.cancelled === true,
  );
  if (cancelled) {
    return cancelled;
  }

  // Avoid treating { started: false } from empty frames as overall success
  const success = responses.find(
    (r) => r.ok && !("started" in r && r.started === false),
  );
  if (success) {
    return success;
  }

  return (
    responses.find((r) => !r.ok) ?? {
      ok: false,
      error: "No frame handled the autofill request",
    }
  );
}

async function sendToTab(
  tabId: number,
  message: AutofillRequest,
  frameId?: number,
): Promise<AutofillResponse> {
  const frameIds = frameId != null && frameId >= 0 ? [frameId] : undefined;

  const attempt = async (): Promise<AutofillResponse[]> => {
    if (frameIds?.length === 1) {
      try {
        const one = (await chrome.tabs.sendMessage(tabId, message, {
          frameId: frameIds[0],
        })) as AutofillResponse;
        return [one];
      } catch {
        // fall through
      }
    }
    return dispatchViaExecuteScript(tabId, message, frameIds);
  };

  const prepare = async (): Promise<void> => {
    // Re-injecting CRXJS content scripts on a live tab flashes or reloads it.
    // Probe first; inject only when the content API is missing.
    const alreadyReady = await waitForContentApi(tabId, frameIds, 1);
    if (!needsContentScriptInject(alreadyReady)) {
      return;
    }
    await ensureContentScripts(tabId);
    const ready = await waitForContentApi(tabId, frameIds);
    if (ready === 0) {
      // One more inject + short wait (extension reload / SPA navigation)
      await ensureContentScripts(tabId);
      await waitForContentApi(tabId, frameIds, 15);
    }
  };

  try {
    // Always prepare for pick/scan — those are sensitive to load races.
    // Fill must not probe/inject first; that flashes the live tab.
    if (shouldPrepareContentScripts(message.type)) {
      await prepare();
    }

    let responses = await attempt();
    const notReady =
      responses.length === 0 ||
      responses.every((r) => !r.ok && r.error === "Content script not ready");

    if (notReady) {
      await prepare();
      responses = await attempt();
    }

    return pickBestResponse(responses, message.type);
  } catch (error) {
    await prepare();
    try {
      const responses = await attempt();
      return pickBestResponse(responses, message.type);
    } catch (retryError) {
      return {
        ok: false,
        error:
          retryError instanceof Error
            ? retryError.message
            : error instanceof Error
              ? error.message
              : "Could not reach the page content script. Refresh the page and try again.",
      };
    }
  }
}

async function resolveTabId(preferred?: number): Promise<number | undefined> {
  if (preferred != null) {
    return preferred;
  }
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.id;
}

chrome.runtime.onInstalled.addListener(() => {
  createContextMenus();
});

chrome.runtime.onStartup.addListener(() => {
  createContextMenus();
});

createContextMenus();

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!isAutofillMenuId(info.menuItemId)) {
    return;
  }

  void (async () => {
    const tabId = await resolveTabId(tab?.id);
    if (tabId == null) {
      return;
    }

    const settings = await loadSettings();
    const frameId = typeof info.frameId === "number" ? info.frameId : undefined;

    if (info.menuItemId === MENU_IDS.FILL) {
      await sendToTab(tabId, { type: MESSAGE.FILL }, frameId);
      return;
    }

    if (info.menuItemId === MENU_IDS.AUTO_TYPE) {
      await sendToTab(
        tabId,
        {
          type: MESSAGE.AUTO_TYPE,
          useContextTarget: true,
          typingDelayMs: settings.typingDelayMs,
          startWithInvalid: settings.startWithInvalid,
        },
        frameId,
      );
    }
  })();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const request = message as AutofillRequest | FieldsUpdatedMessage;

  if (request.type === MESSAGE.FIELDS_UPDATED) {
    void saveLastScan(
      request.fields,
      request.url,
      request.rootSelector,
    ).then(() => sendResponse({ ok: true }));
    return true;
  }

  if (request.type === MESSAGE.GET_SETTINGS) {
    void loadSettings().then((settings) =>
      sendResponse({ ok: true, settings }),
    );
    return true;
  }

  if (request.type === MESSAGE.GET_LAST_SCAN) {
    void loadLastScan().then((scan) =>
      sendResponse({
        ok: true,
        fields: scan?.fields ?? [],
        url: scan?.url ?? "",
        rootSelector: scan?.rootSelector,
      }),
    );
    return true;
  }

  if (request.type === MESSAGE.SET_SETTINGS) {
    void saveSettings(request.settings).then((settings) =>
      sendResponse({ ok: true, settings }),
    );
    return true;
  }

  if (request.type === MESSAGE.GET_FAB_POSITION) {
    void loadFabPosition().then((position) =>
      sendResponse({ ok: true, position }),
    );
    return true;
  }

  if (request.type === MESSAGE.SET_FAB_POSITION) {
    void saveFabPosition(request.position).then(() =>
      sendResponse({ ok: true, position: request.position }),
    );
    return true;
  }

  if (request.type === MESSAGE.FILL_CONTROLLED_DATE) {
    void (async () => {
      const tabId = sender.tab?.id;
      if (tabId == null) {
        sendResponse({ ok: false, error: "No active tab" } satisfies MainWorldFillResult);
        return;
      }

      const fillRequest = request as FillControlledDateRequest;
      const frameId = sender.frameId;
      const target: chrome.scripting.InjectionTarget =
        frameId != null && frameId >= 0
          ? { tabId, frameIds: [frameId] }
          : { tabId, allFrames: false };

      try {
        const results = await chrome.scripting.executeScript({
          target,
          world: "MAIN",
          func: fillControlledDateMainWorld,
          args: [
            fillRequest.marker,
            fillRequest.value,
            fillRequest.label,
          ],
        });
        const result = results[0]?.result as MainWorldFillResult | undefined;
        sendResponse(result ?? { ok: false, error: "No MAIN-world result" });
      } catch (error) {
        sendResponse({
          ok: false,
          error:
            error instanceof Error
              ? error.message
              : "MAIN-world date fill failed",
        } satisfies MainWorldFillResult);
      }
    })();
    return true;
  }

  if (
    request.type === MESSAGE.SCAN ||
    request.type === MESSAGE.FILL ||
    request.type === MESSAGE.AUTO_TYPE ||
    request.type === MESSAGE.START_PICK_SCAN ||
    request.type === MESSAGE.START_PICK_FILL ||
    request.type === MESSAGE.CANCEL_PICK_SCAN
  ) {
    void (async () => {
      const tabId = sender.tab?.id ?? (await resolveTabId());
      if (tabId == null) {
        sendResponse({ ok: false, error: "No active tab" });
        return;
      }

      const response = await sendToTab(tabId, request);
      if (response.ok && "fields" in response && response.fields) {
        await saveLastScan(
          response.fields,
          response.url,
          response.rootSelector,
        );
      }
      sendResponse(response);
    })();
    return true;
  }

  return false;
});
