import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { serverSearchChanged } from "./data-table-search";

describe("serverSearchChanged", () => {
  it("ignores an empty box that already matches the page", () => {
    assert.equal(serverSearchChanged("", ""), null);
    assert.equal(serverSearchChanged("  ", ""), null);
  });

  it("ignores a one-character search", () => {
    assert.equal(serverSearchChanged("a", ""), null);
  });

  it("sends a search of at least two characters", () => {
    assert.equal(serverSearchChanged(" an ", ""), "an");
  });

  it("clears a search that is already applied", () => {
    assert.equal(serverSearchChanged("", "ann"), "");
  });
});