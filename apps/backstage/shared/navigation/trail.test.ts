import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  EMPTY_TRAIL,
  isTrailState,
  MAX_TRAIL_ENTRIES,
  push,
  retarget,
  setLabel,
  truncateTo,
  type TrailState,
} from "./trail";

describe("push", () => {
  it("appends the page being left and makes the destination the new owner", () => {
    const next = push(EMPTY_TRAIL, { href: "/flows", label: "Request Flow" }, "/docs/database/hrms/SP_X");
    assert.deepEqual(next, {
      owner: "/docs/database/hrms/SP_X",
      ownerLabel: null,
      entries: [{ href: "/flows", label: "Request Flow" }],
    });
  });

  it("keeps only the most recent MAX_TRAIL_ENTRIES crumbs", () => {
    let state: TrailState = EMPTY_TRAIL;
    for (let index = 0; index < MAX_TRAIL_ENTRIES + 3; index += 1) {
      state = push(state, { href: `/page-${index}`, label: `Page ${index}` }, `/page-${index + 1}`);
    }
    assert.equal(state.entries.length, MAX_TRAIL_ENTRIES);
    assert.equal(state.entries[0]?.href, "/page-3");
    assert.equal(state.entries.at(-1)?.href, `/page-${MAX_TRAIL_ENTRIES + 2}`);
  });
});

describe("truncateTo", () => {
  const state: TrailState = {
    owner: "/c",
    ownerLabel: "C",
    entries: [
      { href: "/a", label: "A" },
      { href: "/b", label: "B" },
    ],
  };

  it("makes the chosen crumb the new owner and drops anything after it", () => {
    assert.deepEqual(truncateTo(state, 0), { owner: "/a", ownerLabel: "A", entries: [] });
    assert.deepEqual(truncateTo(state, 1), { owner: "/b", ownerLabel: "B", entries: [{ href: "/a", label: "A" }] });
  });

  it("is a no-op for an out-of-range index", () => {
    assert.equal(truncateTo(state, -1), state);
    assert.equal(truncateTo(state, 2), state);
  });
});

describe("retarget", () => {
  const state: TrailState = { owner: "/current", ownerLabel: "Current", entries: [{ href: "/a", label: "A" }] };

  it("repoints the owner when the href matches the current owner", () => {
    assert.deepEqual(retarget(state, "/current", "/current?v=2"), { ...state, owner: "/current?v=2" });
  });

  it("is a no-op when this page is not the current owner", () => {
    assert.equal(retarget(state, "/other", "/other?v=2"), state);
  });
});

describe("setLabel", () => {
  const state: TrailState = { owner: "/current", ownerLabel: null, entries: [] };

  it("sets the label when the href matches the current owner", () => {
    assert.deepEqual(setLabel(state, "/current", "Current page"), { ...state, ownerLabel: "Current page" });
  });

  it("is a no-op when this page is not the current owner", () => {
    assert.equal(setLabel(state, "/other", "Other"), state);
  });

  it("is a no-op when the label did not change", () => {
    const labelled: TrailState = { ...state, ownerLabel: "Current page" };
    assert.equal(setLabel(labelled, "/current", "Current page"), labelled);
  });

  it("claims an empty trail, so the first page of a path gets a real label", () => {
    assert.deepEqual(setLabel(EMPTY_TRAIL, "/flows", "Request Flow"), {
      owner: "/flows",
      ownerLabel: "Request Flow",
      entries: [],
    });
  });
});

describe("isTrailState", () => {
  it("accepts a well-formed trail state", () => {
    assert.equal(isTrailState(EMPTY_TRAIL), true);
    assert.equal(
      isTrailState({ owner: "/a", ownerLabel: "A", entries: [{ href: "/b", label: "B" }] }),
      true,
    );
  });

  it("rejects malformed input", () => {
    assert.equal(isTrailState(null), false);
    assert.equal(isTrailState("not an object"), false);
    assert.equal(isTrailState({ owner: 1, ownerLabel: null, entries: [] }), false);
    assert.equal(isTrailState({ owner: null, ownerLabel: null, entries: [{ href: "/a" }] }), false);
  });
});
