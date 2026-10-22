import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { pathMatchesOpsHref } from "./ops-nav-path.ts";

describe("pathMatchesOpsHref", () => {
  it("matches the exact href and nested paths", () => {
    assert.equal(pathMatchesOpsHref("/azure", "/azure"), true);
    assert.equal(pathMatchesOpsHref("/azure/sprints", "/azure"), true);
    assert.equal(pathMatchesOpsHref("/employers/1", "/employers"), true);
    assert.equal(pathMatchesOpsHref("/dbs", "/dbs"), true);
  });

  it("rejects unrelated or prefix-similar paths", () => {
    assert.equal(pathMatchesOpsHref("/", "/azure"), false);
    assert.equal(pathMatchesOpsHref("/docs", "/azure"), false);
    assert.equal(pathMatchesOpsHref("/azureish", "/azure"), false);
    assert.equal(pathMatchesOpsHref("/employers-extra", "/employers"), false);
  });
});
