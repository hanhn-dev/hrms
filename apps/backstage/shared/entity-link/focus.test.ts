import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { groupIdMatches, namesMatch } from "./focus.ts";

describe("namesMatch", () => {
  it("matches a section or page name without case or surrounding space", () => {
    assert.equal(namesMatch("Bank Details", " bank details "), true);
    assert.equal(namesMatch("PersonalInformation", "PersonalInformation"), true);
  });

  it("rejects a different name and an empty focus", () => {
    assert.equal(namesMatch("Bank Details", "Visa Details"), false);
    assert.equal(namesMatch("Bank Details", "  "), false);
    assert.equal(namesMatch("  ", "Bank Details"), false);
    assert.equal(namesMatch(null, "Bank Details"), false);
  });
});

describe("groupIdMatches", () => {
  it("matches the focused role id", () => {
    assert.equal(groupIdMatches(12, 12), true);
  });

  it("rejects a different id and a missing focus", () => {
    assert.equal(groupIdMatches(12, 4), false);
    assert.equal(groupIdMatches(12, null), false);
  });
});
