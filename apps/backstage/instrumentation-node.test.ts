import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { shouldIgnoreProcessWarning } from "./instrumentation-node.ts";

describe("shouldIgnoreProcessWarning", () => {
  it("ignores the url.parse deprecation", () => {
    const warning = Object.assign(new Error("url.parse()"), {
      name: "DeprecationWarning",
      code: "DEP0169",
    });
    assert.equal(shouldIgnoreProcessWarning(warning), true);
  });

  it("keeps other warnings, including a warning with no code", () => {
    const otherDeprecation = Object.assign(new Error("other"), {
      name: "DeprecationWarning",
      code: "DEP0001",
    });
    assert.equal(shouldIgnoreProcessWarning(otherDeprecation), false);
    assert.equal(shouldIgnoreProcessWarning(new Error("plain")), false);
  });
});
