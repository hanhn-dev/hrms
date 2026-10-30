import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { searchInputValue, serverSearchChanged } from "./data-table-search";

describe("searchInputValue", () => {
  it("keeps typed text while the box is focused", () => {
    assert.equal(searchInputValue("acme", "ac", true), "acme");
    assert.equal(searchInputValue("ac", "acme", true), "ac");
  });

  it("adopts the applied search when the box is not focused", () => {
    assert.equal(searchInputValue("acme", "", false), "");
    assert.equal(searchInputValue("", "ann", false), "ann");
  });
});

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