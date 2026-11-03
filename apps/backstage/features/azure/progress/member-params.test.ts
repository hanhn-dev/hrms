import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  parseMemberParams,
  parseTeamId,
  serializeMemberParams,
} from "./member-params.ts";

describe("parseTeamId", () => {
  it("returns null for a blank team id", () => {
    assert.equal(parseTeamId(undefined), null);
    assert.equal(parseTeamId("  "), null);
  });

  it("returns the trimmed id", () => {
    assert.equal(parseTeamId(" abc "), "abc");
  });
});

describe("parseMemberParams", () => {
  it("returns nothing when the query has no members", () => {
    assert.deepEqual(parseMemberParams(undefined), []);
    assert.deepEqual(parseMemberParams(""), []);
    assert.deepEqual(parseMemberParams(["", "  "]), []);
  });

  it("dedupes and trims repeatable values", () => {
    assert.deepEqual(parseMemberParams([" Alice ", "Bob", "Alice"]), ["Alice", "Bob"]);
    assert.deepEqual(parseMemberParams("Carol"), ["Carol"]);
  });
});

describe("serializeMemberParams", () => {
  it("omits an empty working list", () => {
    assert.equal(serializeMemberParams([]), null);
    assert.equal(serializeMemberParams(["", " "]), null);
  });

  it("returns deduped names for the query string", () => {
    assert.deepEqual(serializeMemberParams(["Bob", "Bob", " Alice "]), ["Bob", "Alice"]);
  });
});
