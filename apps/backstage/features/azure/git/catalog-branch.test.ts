import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { resolveCatalogBranch } from "./catalog-branch.ts";

const qa = { name: "QA", commitId: "qa-commit" };

describe("resolveCatalogBranch", () => {
  it("uses Dev even when another branch is the fallback", () => {
    assert.deepEqual(resolveCatalogBranch([qa, { name: "dev", commitId: "lower" }], "QA"), {
      name: "dev",
      commitId: "lower",
    });
  });

  it("uses the fallback branch when Dev is absent", () => {
    assert.deepEqual(resolveCatalogBranch([qa], "QA"), qa);
  });

  it("returns nothing when neither Dev nor the fallback exists", () => {
    assert.equal(resolveCatalogBranch([qa], "main"), null);
    assert.equal(resolveCatalogBranch([], "QA"), null);
  });
});
