import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  diffQueryRows,
  formatCompareValue,
  isDefaultIgnoredColumn,
  resolveComparePair,
  splitCapturedScript,
} from "./data-table-compare.ts";

describe("splitCapturedScript", () => {
  it("returns nothing for a blank script", () => {
    assert.deepEqual(splitCapturedScript(""), []);
    assert.deepEqual(splitCapturedScript("   "), []);
  });

  it("splits numbered query headings", () => {
    assert.deepEqual(
      splitCapturedScript("-- query 1\nSELECT 1\n\n-- query 2\nSELECT 2"),
      ["SELECT 1", "SELECT 2"],
    );
  });

  it("keeps a single statement", () => {
    assert.deepEqual(splitCapturedScript("SELECT 1"), ["SELECT 1"]);
  });
});

describe("resolveComparePair", () => {
  it("rejects an unknown environment", () => {
    assert.throws(
      () => resolveComparePair("DEV", "prod", ["DEV", "QA"]),
      /Unknown environment: prod/,
    );
  });

  it("rejects comparing an environment to itself", () => {
    assert.throws(
      () => resolveComparePair("DEV", "dev", ["DEV", "QA"]),
      /different environment/,
    );
  });

  it("normalizes the other environment", () => {
    assert.deepEqual(resolveComparePair("DEV", " qa ", ["DEV", "QA"]), {
      rightEnv: "QA",
    });
  });
});

describe("diffQueryRows", () => {
  it("ignores columns that end in ID or Id", () => {
    assert.equal(isDefaultIgnoredColumn("FieldID"), true);
    assert.equal(isDefaultIgnoredColumn("EmployerId"), true);
    assert.equal(isDefaultIgnoredColumn("Valid"), false);
    assert.equal(isDefaultIgnoredColumn("Grid"), false);

    const diff = diffQueryRows(
      [{ FieldID: 1, FieldName: "Branch" }],
      [{ FieldID: 9, FieldName: "Branch" }],
    );
    assert.equal(diff.rows.length, 0);
    assert.deepEqual(diff.columns, ["FieldName"]);
  });

  it("keeps an id column when ignore is cleared", () => {
    const diff = diffQueryRows(
      [{ FieldID: 1, FieldName: "Branch" }],
      [{ FieldID: 9, FieldName: "Branch" }],
      { ignoreColumns: [] },
    );
    assert.equal(diff.counts["only-left"], 1);
    assert.equal(diff.counts["only-right"], 1);
  });

  it("counts duplicate rows instead of collapsing them", () => {
    const diff = diffQueryRows(
      [{ Name: "A" }, { Name: "A" }],
      [{ Name: "A" }],
      { ignoreColumns: [] },
    );
    assert.equal(diff.counts["only-left"], 1);
    assert.equal(diff.counts["only-right"], 0);
  });

  it("reports a row that exists on only one side", () => {
    const diff = diffQueryRows([{ Name: "A" }], [], { ignoreColumns: [] });
    assert.equal(diff.rows[0]?.status, "only-left");
    assert.deepEqual(diff.rows[0]?.values, { Name: "A" });
  });

  it("pairs rows on a key and lists drifted columns", () => {
    const diff = diffQueryRows(
      [{ FieldName: "Branch", DisplayText: "Branch" }],
      [{ FieldName: "Branch", DisplayText: "Branch name" }],
      { ignoreColumns: [], matchColumns: ["FieldName"] },
    );
    assert.equal(diff.counts.changed, 1);
    assert.deepEqual(diff.rows[0]?.changes.DisplayText, {
      left: "Branch",
      right: "Branch name",
    });
  });

  it("leaves duplicate keys unmatched", () => {
    const diff = diffQueryRows(
      [
        { FieldName: "Branch", DisplayText: "One" },
        { FieldName: "Branch", DisplayText: "Two" },
      ],
      [{ FieldName: "Branch", DisplayText: "Three" }],
      { ignoreColumns: [], matchColumns: ["FieldName"] },
    );
    assert.equal(diff.counts.changed, 0);
    assert.equal(diff.counts["only-left"], 2);
    assert.equal(diff.counts["only-right"], 1);
  });

  it("formats null as NULL", () => {
    assert.equal(formatCompareValue(null), "NULL");
    assert.equal(formatCompareValue(undefined), "NULL");
  });
});
