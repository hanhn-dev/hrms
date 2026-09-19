import {
  DEFAULT_SETTINGS,
  type AutofillSettings,
  type FabPosition,
  type ScannedField,
} from "./messaging";

/**
 * Storage helpers — call only from the background service worker.
 * Content scripts and the popup must use messaging; chrome.storage can throw
 * "Access to storage is not allowed from this context" outside the SW.
 */

const FIELDS_KEY = "autofill:lastScan";
const SETTINGS_KEY = "autofill:settings";
const FAB_POSITION_KEY = "autofill:fabPosition";

export interface LastScanPayload {
  fields: ScannedField[];
  url: string;
  scannedAt: number;
  rootSelector?: string;
}

function storageArea(): chrome.storage.StorageArea {
  return chrome.storage.session ?? chrome.storage.local;
}

export async function saveLastScan(
  fields: ScannedField[],
  url: string,
  rootSelector?: string,
): Promise<void> {
  const payload: LastScanPayload = {
    fields,
    url,
    scannedAt: Date.now(),
    rootSelector,
  };
  await storageArea().set({ [FIELDS_KEY]: payload });
}

export async function loadLastScan(): Promise<LastScanPayload | null> {
  const result = await storageArea().get(FIELDS_KEY);
  return (result[FIELDS_KEY] as LastScanPayload | undefined) ?? null;
}

export async function loadSettings(): Promise<AutofillSettings> {
  const result = await storageArea().get(SETTINGS_KEY);
  const stored = result[SETTINGS_KEY] as Partial<AutofillSettings> | undefined;
  return { ...DEFAULT_SETTINGS, ...stored };
}

export async function saveSettings(
  settings: Partial<AutofillSettings>,
): Promise<AutofillSettings> {
  const next = { ...(await loadSettings()), ...settings };
  await storageArea().set({ [SETTINGS_KEY]: next });
  return next;
}

/** FAB position uses local storage so it survives extension reloads and browser restarts. */
export async function loadFabPosition(): Promise<FabPosition | null> {
  const result = await chrome.storage.local.get(FAB_POSITION_KEY);
  const stored = result[FAB_POSITION_KEY] as FabPosition | undefined;
  if (
    stored &&
    typeof stored.left === "number" &&
    typeof stored.top === "number"
  ) {
    return { left: stored.left, top: stored.top };
  }
  return null;
}

export async function saveFabPosition(position: FabPosition): Promise<void> {
  await chrome.storage.local.set({ [FAB_POSITION_KEY]: position });
}
