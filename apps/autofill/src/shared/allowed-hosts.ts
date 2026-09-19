/**
 * Sites where Form Autofill may run (content script, FAB, context menus).
 *
 * Chrome `*.host` patterns match subdomains only, so the apex
 * `thedigitalgroup.com` is listed separately. `*.localhost` covers
 * names like `app.localhost` that browsers treat as loopback.
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

/** True when the page URL is localhost (any port) or a TDG host. */
export function isAllowedPageUrl(url: string | null | undefined): boolean {
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

  const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  return isLocalhostHostname(hostname) || isTdgHostname(hostname);
}

export const DISALLOWED_PAGE_ERROR =
  "Autofill is only available on localhost and *.thedigitalgroup.com";
