import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  SOFT_NAV_SKELETON_IDLE_MS,
  SOFT_NAV_URL_WAIT_MS,
  isNavigationRscFetch,
  softNavRecoveryHref,
  type SoftNavRecoveryInput,
} from "./soft-nav-recovery.ts";

function snapshot(overrides: Partial<SoftNavRecoveryInput> = {}): SoftNavRecoveryInput {
  return {
    targetHref: null,
    currentHref: "/azure/board",
    skeletonVisible: false,
    navigationInflight: 0,
    sinceClickMs: 0,
    skeletonIdleMs: 0,
    recoveredHrefs: [],
    ...overrides,
  };
}

describe("softNavRecoveryHref", () => {
  it("assigns the clicked href when the URL never changes", () => {
    assert.equal(
      softNavRecoveryHref(
        snapshot({
          targetHref: "/azure/git",
          currentHref: "/azure/board",
          sinceClickMs: SOFT_NAV_URL_WAIT_MS,
        }),
      ),
      "/azure/git",
    );
  });

  it("waits while the click is still inside the soft-nav window", () => {
    assert.equal(
      softNavRecoveryHref(
        snapshot({
          targetHref: "/azure/git",
          currentHref: "/azure/board",
          sinceClickMs: SOFT_NAV_URL_WAIT_MS - 1,
        }),
      ),
      null,
    );
  });

  it("waits while a navigation flight is open, even if a skeleton is showing", () => {
    assert.equal(
      softNavRecoveryHref(
        snapshot({
          targetHref: "/azure/git",
          currentHref: "/azure/git",
          skeletonVisible: true,
          navigationInflight: 1,
          sinceClickMs: SOFT_NAV_URL_WAIT_MS,
          skeletonIdleMs: SOFT_NAV_SKELETON_IDLE_MS,
        }),
      ),
      null,
    );
  });

  it("reloads the committed URL once the skeleton has been idle", () => {
    assert.equal(
      softNavRecoveryHref(
        snapshot({
          targetHref: "/azure/git",
          currentHref: "/azure/git",
          skeletonVisible: true,
          sinceClickMs: SOFT_NAV_URL_WAIT_MS,
          skeletonIdleMs: SOFT_NAV_SKELETON_IDLE_MS,
        }),
      ),
      "/azure/git",
    );
  });

  it("does not reload a skeleton that only just lost its flight", () => {
    assert.equal(
      softNavRecoveryHref(
        snapshot({
          currentHref: "/employers/10/employees",
          skeletonVisible: true,
          skeletonIdleMs: SOFT_NAV_SKELETON_IDLE_MS - 1,
        }),
      ),
      null,
    );
  });

  it("skips a URL that this tab already hard-loaded", () => {
    assert.equal(
      softNavRecoveryHref(
        snapshot({
          targetHref: "/azure/git",
          currentHref: "/azure/board",
          sinceClickMs: SOFT_NAV_URL_WAIT_MS,
          recoveredHrefs: ["/azure/git"],
        }),
      ),
      null,
    );
    assert.equal(
      softNavRecoveryHref(
        snapshot({
          currentHref: "/employers/10/employees?q=a",
          skeletonVisible: true,
          skeletonIdleMs: SOFT_NAV_SKELETON_IDLE_MS,
          recoveredHrefs: ["/employers/10/employees?q=a"],
        }),
      ),
      null,
    );
  });

  it("treats a different search as a different page", () => {
    assert.equal(
      softNavRecoveryHref(
        snapshot({
          targetHref: "/employers/10/employees?q=b",
          currentHref: "/employers/10/employees?q=a",
          sinceClickMs: SOFT_NAV_URL_WAIT_MS,
        }),
      ),
      "/employers/10/employees?q=b",
    );
  });
});

describe("isNavigationRscFetch", () => {
  it("counts a navigation flight and ignores prefetch, refresh, and session calls", () => {
    assert.equal(isNavigationRscFetch("/azure/git", { headers: { rsc: "1" } }), true);
    assert.equal(
      isNavigationRscFetch("/azure/git", {
        headers: { rsc: "1", "next-router-prefetch": "1" },
      }),
      false,
    );
    assert.equal(
      isNavigationRscFetch("/azure/git", {
        headers: { rsc: "1", "next-router-prefetch": "2" },
      }),
      false,
    );
    assert.equal(
      isNavigationRscFetch("/azure/git", {
        headers: { rsc: "1", "next-hmr-refresh": "1" },
      }),
      false,
    );
    assert.equal(isNavigationRscFetch("/api/auth/session"), false);
  });
});
