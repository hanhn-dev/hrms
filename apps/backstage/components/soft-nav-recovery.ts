/** How long a click may wait before a soft navigation that never changes the URL is replaced. */
export const SOFT_NAV_URL_WAIT_MS = 2_000;

/**
 * How long a section skeleton may sit with no navigation request in flight
 * before the committed URL is loaded as a full document.
 */
export const SOFT_NAV_SKELETON_IDLE_MS = 1_500;

const HREF_BASE = "http://backstage.local";

export type SoftNavRecoveryInput = {
  /** Path and search from the click, or null when no click is pending. */
  targetHref: string | null;
  /** `location.pathname` plus `location.search`. */
  currentHref: string;
  skeletonVisible: boolean;
  navigationInflight: number;
  sinceClickMs: number;
  /** How long the skeleton has been visible with zero navigation requests. */
  skeletonIdleMs: number;
  /** Path-and-search keys already hard-loaded in this tab. */
  recoveredHrefs: readonly string[];
};

/** Path and search, so `/azure/git?x=1#y` and `/azure/git?x=1` are the same place. */
export function normalizeHref(href: string): string {
  const url = new URL(href, HREF_BASE);
  return `${url.pathname}${url.search}`;
}

export function hrefArrived(currentHref: string, targetHref: string): boolean {
  return normalizeHref(currentHref) === normalizeHref(targetHref);
}

/**
 * True for an App Router navigation flight. Prefetch and dev refresh requests
 * also send `rsc: 1` and must not keep a stuck skeleton looking busy.
 */
export function isNavigationRscFetch(input: RequestInfo | URL, init?: RequestInit): boolean {
  const headers = new Headers(
    init?.headers ?? (input instanceof Request ? input.headers : undefined),
  );
  if (headers.get("rsc") !== "1") {
    return false;
  }
  if (headers.get("next-router-prefetch") != null) {
    return false;
  }
  if (headers.get("next-router-segment-prefetch") != null) {
    return false;
  }
  if (headers.get("next-hmr-refresh") != null) {
    return false;
  }
  return true;
}

function alreadyRecovered(href: string, recoveredHrefs: readonly string[]): boolean {
  const key = normalizeHref(href);
  return recoveredHrefs.some((item) => item === key);
}

/**
 * Href to load as a full document, or null to keep waiting.
 * An open navigation flight always waits: a slow query is still streaming.
 */
export function softNavRecoveryHref(input: SoftNavRecoveryInput): string | null {
  if (input.navigationInflight > 0) {
    return null;
  }

  if (
    input.targetHref != null &&
    input.sinceClickMs >= SOFT_NAV_URL_WAIT_MS &&
    !hrefArrived(input.currentHref, input.targetHref)
  ) {
    return alreadyRecovered(input.targetHref, input.recoveredHrefs) ? null : input.targetHref;
  }

  if (input.skeletonVisible && input.skeletonIdleMs >= SOFT_NAV_SKELETON_IDLE_MS) {
    return alreadyRecovered(input.currentHref, input.recoveredHrefs) ? null : input.currentHref;
  }

  return null;
}
