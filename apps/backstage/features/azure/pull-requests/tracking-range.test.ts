import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  DEFAULT_TRACKING_PR_MODE,
  DEFAULT_TRACKING_PR_PRESET,
  parseTrackingPrMode,
  parseTrackingPrPreset,
  resolvePresetRange,
} from "./tracking-range.ts";

describe("resolvePresetRange", () => {
  const now = new Date(2026, 10, 4); // 4 Nov 2026 local

  it("resolves last week as 7 inclusive days ending today", () => {
    assert.deepEqual(resolvePresetRange("1w", now), {
      from: "2026-10-29",
      to: "2026-11-04",
    });
  });

  it("resolves last 2 and 3 weeks", () => {
    assert.deepEqual(resolvePresetRange("2w", now), {
      from: "2026-10-22",
      to: "2026-11-04",
    });
    assert.deepEqual(resolvePresetRange("3w", now), {
      from: "2026-10-15",
      to: "2026-11-04",
    });
  });

  it("resolves last month and last 3 months", () => {
    assert.deepEqual(resolvePresetRange("1m", now), {
      from: "2026-10-04",
      to: "2026-11-04",
    });
    assert.deepEqual(resolvePresetRange("3m", now), {
      from: "2026-08-04",
      to: "2026-11-04",
    });
  });
});

describe("parseTrackingPrMode", () => {
  it("defaults to preset", () => {
    assert.equal(parseTrackingPrMode(undefined), DEFAULT_TRACKING_PR_MODE);
    assert.equal(parseTrackingPrMode(""), "preset");
    assert.equal(parseTrackingPrMode("preset"), "preset");
  });

  it("accepts sprint and custom", () => {
    assert.equal(parseTrackingPrMode("sprint"), "sprint");
    assert.equal(parseTrackingPrMode("Custom"), "custom");
  });
});

describe("parseTrackingPrPreset", () => {
  it("defaults to last week", () => {
    assert.equal(parseTrackingPrPreset(undefined), DEFAULT_TRACKING_PR_PRESET);
    assert.equal(parseTrackingPrPreset("nope"), "1w");
  });

  it("accepts known presets", () => {
    assert.equal(parseTrackingPrPreset("2w"), "2w");
    assert.equal(parseTrackingPrPreset("3M"), "3m");
  });
});
