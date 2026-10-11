/**
 * The visit trail is the path a user actually took through the docs chrome
 * (Flows -> a write-up -> a related write-up -> ...), so a page reached
 * through another page can always be undone. It is intentionally separate
 * from a page's own "parent" link (e.g. a database doc's "Database objects"
 * link) -- that is a fixed hierarchy link, this is the dynamic path taken.
 */

export type TrailEntry = { href: string; label: string };

export type TrailState = {
  /** The href of the page the trail currently belongs to (the page being viewed). */
  owner: string | null;
  /** The display label of `owner`, once that page has registered one. */
  ownerLabel: string | null;
  /** Earlier pages on the path, oldest first. Does not include `owner`. */
  entries: TrailEntry[];
};

export const MAX_TRAIL_ENTRIES = 8;

export const EMPTY_TRAIL: TrailState = { owner: null, ownerLabel: null, entries: [] };

/** Leaving `from` (the current page) to go view `to`. */
export function push(state: TrailState, from: TrailEntry, to: string): TrailState {
  const entries = [...state.entries, from].slice(-MAX_TRAIL_ENTRIES);
  return { owner: to, ownerLabel: null, entries };
}

/** Jumping back to an earlier crumb: it becomes the owner, anything after it is dropped. */
export function truncateTo(state: TrailState, index: number): TrailState {
  const target = state.entries[index];
  if (!target) return state;
  return { owner: target.href, ownerLabel: target.label, entries: state.entries.slice(0, index) };
}

/**
 * Same logical page, new href (a version switch, a different Flows node).
 * A no-op when `currentHref` is not the current owner, so a stray call never
 * attaches an unrelated page's history to this one.
 */
export function retarget(state: TrailState, currentHref: string, nextHref: string): TrailState {
  if (state.owner !== currentHref) return state;
  return { ...state, owner: nextHref };
}

/**
 * Registers the current page's display label. When nothing owns the trail
 * yet, this page claims it (the start of a new path). Otherwise a no-op
 * unless `href` is already the current owner -- a page reached outside the
 * trail does not inherit someone else's history.
 */
export function setLabel(state: TrailState, href: string, label: string): TrailState {
  if (state.owner === href) {
    return state.ownerLabel === label ? state : { ...state, ownerLabel: label };
  }
  if (state.owner === null) return { owner: href, ownerLabel: label, entries: [] };
  return state;
}

function isTrailEntry(value: unknown): value is TrailEntry {
  return (
    value !== null &&
    typeof value === "object" &&
    typeof (value as TrailEntry).href === "string" &&
    typeof (value as TrailEntry).label === "string"
  );
}

export function isTrailState(value: unknown): value is TrailState {
  if (value === null || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  if (candidate.owner !== null && typeof candidate.owner !== "string") return false;
  if (candidate.ownerLabel !== null && typeof candidate.ownerLabel !== "string") return false;
  return Array.isArray(candidate.entries) && candidate.entries.every(isTrailEntry);
}
