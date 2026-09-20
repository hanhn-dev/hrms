import {
  DEFAULT_SETTINGS,
  type AutofillSettings,
  type FabPosition,
  type FillReport,
  type ScannedField,
} from "./messaging";
import {
  DEFAULT_PERSONA_ID,
  isPersonaId,
} from "@/features/personas";
import {
  DEFAULT_SCENARIO_ID,
  isScenarioId,
} from "@/features/scenarios";
import { normalizeCustomHostInput } from "./allowed-hosts";

/**
 * Storage helpers — call only from the background service worker.
 * Content scripts and the popup must use messaging; chrome.storage can throw
 * "Access to storage is not allowed from this context" outside the SW.
 */

const FIELDS_KEY = "autofill:lastScan";
const SETTINGS_KEY = "autofill:settings";
const FAB_POSITION_KEY = "autofill:fabPosition";
const FILL_REPORT_KEY = "autofill:lastFillReport";
const CUSTOM_HOSTS_KEY = "autofill:customHosts";

export interface LastScanPayload {
  fields: ScannedField[];
  url: string;
  scannedAt: number;
  rootSelector?: string;
}

function storageArea(): chrome.storage.StorageArea {
  return chrome.storage.session ?? chrome.storage.local;
}

function normalizeSettings(
  stored: Partial<AutofillSettings> | undefined,
): AutofillSettings {
  const merged = { ...DEFAULT_SETTINGS, ...stored };
  return {
    typingDelayMs:
      typeof merged.typingDelayMs === "number"
        ? merged.typingDelayMs
        : DEFAULT_SETTINGS.typingDelayMs,
    startWithInvalid: Boolean(merged.startWithInvalid),
    activePersonaId: isPersonaId(merged.activePersonaId)
      ? merged.activePersonaId
      : DEFAULT_PERSONA_ID,
    activeScenarioId: isScenarioId(merged.activeScenarioId)
      ? merged.activeScenarioId
      : DEFAULT_SCENARIO_ID,
    overwriteExistingValues: Boolean(merged.overwriteExistingValues),
  };
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
  return normalizeSettings(stored);
}

export async function saveSettings(
  settings: Partial<AutofillSettings>,
): Promise<AutofillSettings> {
  const next = normalizeSettings({ ...(await loadSettings()), ...settings });
  await storageArea().set({ [SETTINGS_KEY]: next });
  return next;
}

export async function saveLastFillReport(report: FillReport): Promise<void> {
  await storageArea().set({ [FILL_REPORT_KEY]: report });
}

export async function loadLastFillReport(): Promise<FillReport | null> {
  const result = await storageArea().get(FILL_REPORT_KEY);
  const stored = result[FILL_REPORT_KEY] as FillReport | undefined;
  if (!stored || !Array.isArray(stored.entries)) {
    return null;
  }
  return stored;
}

/** Custom hosts use local storage so they survive extension reloads. */
export async function loadCustomHosts(): Promise<string[]> {
  const result = await chrome.storage.local.get(CUSTOM_HOSTS_KEY);
  const stored = result[CUSTOM_HOSTS_KEY];
  if (!Array.isArray(stored)) {
    return [];
  }
  const hosts: string[] = [];
  for (const entry of stored) {
    const normalized = normalizeCustomHostInput(
      typeof entry === "string" ? entry : "",
    );
    if (normalized && !hosts.includes(normalized)) {
      hosts.push(normalized);
    }
  }
  return hosts;
}

export async function saveCustomHosts(hosts: string[]): Promise<string[]> {
  const next: string[] = [];
  for (const entry of hosts) {
    const normalized = normalizeCustomHostInput(entry);
    if (normalized && !next.includes(normalized)) {
      next.push(normalized);
    }
  }
  await chrome.storage.local.set({ [CUSTOM_HOSTS_KEY]: next });
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
