import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { joinWorkItemIdTags, splitWorkItemIdTags } from "./work-item-id-tags.ts";

describe("splitWorkItemIdTags", () => {
  it("returns nothing for blank input", () => {
    assert.deepEqual(splitWorkItemIdTags(""), []);
    assert.deepEqual(splitWorkItemIdTags("   "), []);
    assert.deepEqual(splitWorkItemIdTags(", ,"), []);
  });

  it("splits and trims comma-separated IDs", () => {
    assert.deepEqual(splitWorkItemIdTags("176568, 178337"), ["176568", "178337"]);
    assert.deepEqual(splitWorkItemIdTags("101,202,303"), ["101", "202", "303"]);
  });
});

describe("joinWorkItemIdTags", () => {
  it("returns an empty string for no tags", () => {
    assert.equal(joinWorkItemIdTags([]), "");
    assert.equal(joinWorkItemIdTags(["", "  "]), "");
  });

  it("joins tags with a comma and space", () => {
    assert.equal(joinWorkItemIdTags(["176568", "178337"]), "176568, 178337");
  });
});
