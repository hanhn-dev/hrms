import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  normalizeEmailStatus,
  parseEmailModuleKey,
  parseEmailStatus,
} from "./status.ts";

describe("normalizeEmailStatus", () => {
  it("maps Core words and satellite char codes", () => {
    assert.equal(normalizeEmailStatus("New"), "New");
    assert.equal(normalizeEmailStatus("n"), "New");
    assert.equal(normalizeEmailStatus(" Pending "), "Pending");
    assert.equal(normalizeEmailStatus("P"), "Pending");
    assert.equal(normalizeEmailStatus("Failed"), "Failed");
    assert.equal(normalizeEmailStatus("F"), "Failed");
    assert.equal(normalizeEmailStatus("Completed"), "Completed");
    assert.equal(normalizeEmailStatus("C"), "Completed");
  });

  it("leaves unmapped codes as Other", () => {
    assert.equal(normalizeEmailStatus(null), "Other");
    assert.equal(normalizeEmailStatus(""), "Other");
    assert.equal(normalizeEmailStatus("Under Review"), "Other");
    assert.equal(normalizeEmailStatus("Y"), "Other");
  });
});

describe("email filter parsers", () => {
  it("accepts known module and status keys only", () => {
    assert.equal(parseEmailModuleKey("travel"), "travel");
    assert.equal(parseEmailModuleKey("TIMEPORT"), null);
    assert.equal(parseEmailStatus("Failed"), "Failed");
    assert.equal(parseEmailStatus("F"), null);
  });
});
