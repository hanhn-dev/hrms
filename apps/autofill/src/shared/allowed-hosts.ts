/**
 * Sites where Form Autofill may run (content script, FAB, context menus).
 *
 * Chrome `*.host` patterns match subdomains only, so the apex
 * `thedigitalgroup.com` is listed separately. `*.localhost` covers
 * names like `app.localhost` that browsers treat as loopback.
 *
 * Additional customer UAT hosts can be stored via chrome.storage and
 * passed as `extraHostnames` (see `isAllowedPageUrl`).
 */
export const ALLOWED_HOST_MATCH_PATTERNS: readonly string[] = [
  "*://localhost/*",
  "*://*.localhost/*",
  "*://127.0.0.1/*",
  "*://[::1]/*",
  "*://thedigitalgroup.com/*",
  "*://*.thedigitalgroup.com/*",
];

const TDG_HOST = "thedigitalgroup.com";

function isLocalhostHostname(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname.endsWith(".localhost")
  );
}

function isTdgHostname(hostname: string): boolean {
  return hostname === TDG_HOST || hostname.endsWith(`.${TDG_HOST}`);
}

function normalizeHostname(hostname: string): string {
  return hostname.trim().toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
}

/** True when hostname is in the extra allowlist (exact or parent subdomain). */
export function matchesExtraHostname(
  hostname: string,
  extraHostnames: readonly string[] | null | undefined,
): boolean {
  if (!extraHostnames?.length) {
    return false;
  }
  const host = normalizeHostname(hostname);
  if (!host) {
    return false;
  }
  return extraHostnames.some((entry) => {
    const allowed = normalizeHostname(entry);
    if (!allowed) {
      return false;
    }
    return host === allowed || host.endsWith(`.${allowed}`);
  });
}

/**
 * Normalize user-entered host / URL / match-pattern into a bare hostname.
 * Returns null when the input is empty, a wildcard-all pattern, or invalid.
 */
export function normalizeCustomHostInput(
  raw: string | null | undefined,
): string | null {
  if (typeof raw !== "string") {
    return null;
  }
  let value = raw.trim().toLowerCase();
  if (!value) {
    return null;
  }
  // Reject all-urls style grants
  if (
    value === "<all_urls>" ||
    value === "*://*/*" ||
    value === "*://*" ||
    value === "*"
  ) {
    return null;
  }

  // Match patterns like https://uat.example.com/* or *://uat.example.com/*
  const matchPattern = value.match(
    /^(?:\*|https?):\/\/([^/*]+)(?:\/.*)?$/i,
  );
  if (matchPattern?.[1]) {
    value = matchPattern[1];
  } else if (value.includes("://")) {
    try {
      value = new URL(value).hostname;
    } catch {
      return null;
    }
  } else if (value.includes("/")) {
    // host/path without scheme
    value = value.split("/")[0] ?? value;
  }

  value = normalizeHostname(value);
  if (!value || value.includes("*") || value.includes(" ")) {
    return null;
  }
  // Basic hostname shape (allow IDN / dotted hosts)
  if (!/^[a-z0-9._:-]+$/i.test(value)) {
    return null;
  }
  return value;
}

/** Build Chrome match patterns for a bare hostname (apex + optional). */
export function hostToMatchPatterns(hostname: string): string[] {
  const host = normalizeHostname(hostname);
  if (!host) {
    return [];
  }
  return [`*://${host}/*`];
}

/** True when the page URL is localhost, TDG, or an extra custom host. */
export function isAllowedPageUrl(
  url: string | null | undefined,
  extraHostnames?: readonly string[] | null,
): boolean {
  if (typeof url !== "string" || url.trim() === "") {
    return false;
  }

  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return false;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return false;
  }

  const hostname = normalizeHostname(parsed.hostname);
  return (
    isLocalhostHostname(hostname) ||
    isTdgHostname(hostname) ||
    matchesExtraHostname(hostname, extraHostnames)
  );
}

export const DISALLOWED_PAGE_ERROR =
  "Autofill is only available on localhost, *.thedigitalgroup.com, or hosts you added under Allowed hosts";
