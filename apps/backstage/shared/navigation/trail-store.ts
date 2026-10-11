"use client";

import {
  EMPTY_TRAIL,
  isTrailState,
  push,
  retarget,
  setLabel,
  truncateTo,
  type TrailEntry,
  type TrailState,
} from "./trail";

const STORAGE_KEY = "backstage:trail";

let state: TrailState = EMPTY_TRAIL;
let hydrated = false;
const listeners = new Set<() => void>();

function hydrate(): void {
  if (hydrated) return;
  hydrated = true;
  if (typeof window === "undefined") return;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (isTrailState(parsed)) state = parsed;
  } catch {
    // A corrupt or inaccessible session storage entry just starts a fresh trail.
  }
}

function commit(next: TrailState): void {
  state = next;
  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Session storage is best-effort; the in-memory trail still works for this tab.
    }
  }
  for (const listener of listeners) listener();
}

export function getTrailSnapshot(): TrailState {
  hydrate();
  return state;
}

export function subscribeTrail(listener: () => void): () => void {
  hydrate();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Leaving `from` (the current page) to go view `to`. Used by `TrailLink`. */
export function pushTrail(from: TrailEntry, to: string): void {
  hydrate();
  commit(push(state, from, to));
}

/** Jumping back to an earlier crumb. Used by `TrailBar`. */
export function truncateTrailTo(index: number): void {
  hydrate();
  commit(truncateTo(state, index));
}

/** Same logical page, new href (a version switch, a different Flows node). */
export function retargetTrail(currentHref: string, nextHref: string): void {
  hydrate();
  commit(retarget(state, currentHref, nextHref));
}

/** Registers the current page's display label. Used by `useTrailLabel`. */
export function announceTrailLabel(href: string, label: string): void {
  hydrate();
  commit(setLabel(state, href, label));
}

/** Drops the trail. Called when a page is reached other than by a trail click. */
export function clearTrail(): void {
  hydrate();
  if (state.owner === null && state.entries.length === 0) return;
  commit(EMPTY_TRAIL);
}
