import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { clampLogWindow, LOG_MAX_WINDOW_MS } from "./window.ts";

describe("clampLogWindow", () => {
  it("caps a span longer than seven days", () => {
    const from = new Date("2026-10-01T00:00:00.000Z");
    const to = new Date(from.getTime() + 8 * 24 * 60 * 60 * 1000);
    const window = clampLogWindow(from, to);
    assert.equal(window.limited, true);
    assert.equal(window.to.getTime() - window.from.getTime(), LOG_MAX_WINDOW_MS);
  });
});
