export const STALE_DAYS_OPTIONS = [2, 3, 5, 7] as const;

export type StaleDays = (typeof STALE_DAYS_OPTIONS)[number];

export const DEFAULT_STALE_DAYS: StaleDays = 3;

export const STALE_DAYS_STORAGE_KEY = "backstage.azure.staleDays";

export type StaleDaysStorage = Pick<Storage, "getItem" | "setItem">;

export function parseStaleDays(value: unknown): StaleDays | null {
  const raw =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseInt(value.trim(), 10)
        : Number.NaN;
  if (!Number.isInteger(raw)) {
    return null;
  }
  return (STALE_DAYS_OPTIONS as readonly number[]).includes(raw) ? (raw as StaleDays) : null;
}

export function readStaleDaysPreference(storage?: StaleDaysStorage | null): StaleDays {
  const resolved = resolveStorage(storage);
  if (resolved == null) {
    return DEFAULT_STALE_DAYS;
  }
  try {
    return parseStaleDays(resolved.getItem(STALE_DAYS_STORAGE_KEY)) ?? DEFAULT_STALE_DAYS;
  } catch {
    return DEFAULT_STALE_DAYS;
  }
}

export function writeStaleDaysPreference(
  days: StaleDays,
  storage?: StaleDaysStorage | null,
): void {
  const resolved = resolveStorage(storage);
  if (resolved == null) {
    return;
  }
  try {
    resolved.setItem(STALE_DAYS_STORAGE_KEY, String(days));
  } catch {
    // Ignore quota / private-mode write failures.
  }
}

export function resolveStaleDays(input: {
  readonly urlValue?: string | null;
  readonly storage?: StaleDaysStorage | null;
}): StaleDays {
  const fromUrl = parseStaleDays(input.urlValue);
  if (fromUrl != null) {
    return fromUrl;
  }
  return readStaleDaysPreference(input.storage);
}

function resolveStorage(storage?: StaleDaysStorage | null): StaleDaysStorage | null {
  if (storage) {
    return storage;
  }
  if (storage === null) {
    return null;
  }
  try {
    return localStorage;
  } catch {
    return null;
  }
}
