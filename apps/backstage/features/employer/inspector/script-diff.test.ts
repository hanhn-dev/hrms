import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { diffDefinitions, diffPlaces } from "./script-diff.ts";

function changedText(spans: { text: string; changed: boolean }[] | null): string {
  return (spans ?? [])
    .filter((span) => span.changed)
    .map((span) => span.text)
    .join("");
}

describe("diffDefinitions", () => {
  it("returns nothing when both sides are empty", () => {
    const diff = diffDefinitions("", "");
    assert.equal(diff.identical, true);
    assert.equal(diff.changedLineCount, 0);
    assert.deepEqual(diff.rows, []);
  });

  it("treats identical text as unchanged", () => {
    const diff = diffDefinitions("SELECT 1\n", "SELECT 1\n");
    assert.equal(diff.identical, true);
    assert.equal(diff.changedLineCount, 0);
    assert.equal(diff.rows.length, 1);
    assert.equal(diff.rows[0]?.kind, "equal");
  });

  it("ignores carriage returns", () => {
    const diff = diffDefinitions("SELECT 1\r\nFROM t", "SELECT 1\nFROM t");
    assert.equal(diff.identical, true);
    assert.equal(diff.changedLineCount, 0);
  });

  it("marks an added line", () => {
    const diff = diffDefinitions("SELECT 1", "SELECT 1\nFROM t");
    assert.equal(diff.identical, false);
    assert.equal(diff.changedLineCount, 1);
    const added = diff.rows.find((row) => row.kind === "added");
    assert.equal(added?.left, null);
    assert.equal(added?.right?.[0]?.text, "FROM t");
  });

  it("highlights a changed word", () => {
    const diff = diffDefinitions(
      "WHERE EmployerId = 1",
      "WHERE EmployerId = 2",
    );
    assert.equal(diff.changedLineCount, 1);
    const changed = diff.rows.find((row) => row.kind === "changed");
    assert.ok(changed);
    assert.equal(changedText(changed.left), "1");
    assert.equal(changedText(changed.right), "2");
  });

  it("treats a missing side as a full addition", () => {
    const diff = diffDefinitions("", "SELECT 1");
    assert.equal(diff.rows.length, 1);
    assert.equal(diff.rows[0]?.kind, "added");
    assert.equal(diff.rows[0]?.left, null);
  });

  it("highlights a table column whose type differs", () => {
    const left = "Id int NOT NULL PK\nName nvarchar(100) NULL";
    const right = "Id int NOT NULL PK\nName nvarchar(200) NULL";
    const diff = diffDefinitions(left, right);
    assert.equal(diff.changedLineCount, 1);
    const changed = diff.rows.find((row) => row.kind === "changed");
    assert.ok(changed);
    assert.equal(changedText(changed.left), "100");
    assert.equal(changedText(changed.right), "200");
    assert.equal(diff.rows[0]?.kind, "equal");
  });
});

describe("diffPlaces", () => {
  it("returns nothing when the definitions match", () => {
    const diff = diffDefinitions("SELECT 1\nFROM t", "SELECT 1\nFROM t");
    assert.deepEqual(diffPlaces(diff.rows), []);
  });

  it("returns nothing for an empty diff", () => {
    assert.deepEqual(diffPlaces([]), []);
  });

  it("groups a run of changes into one place and keeps a later change separate", () => {
    const diff = diffDefinitions(
      "SELECT 1\nFROM old\nWHERE a = 1\nORDER BY a",
      "SELECT 2\nFROM new\nWHERE a = 1\nORDER BY b",
    );
    const places = diffPlaces(diff.rows);
    assert.equal(places.length, 2);
    assert.equal(places[0]?.leftLine, 1);
    assert.equal(places[0]?.rightLine, 1);
    assert.equal(places[0]?.lineCount, 2);
    assert.equal(places[0]?.preview, "1 → 2");
    assert.equal(places[1]?.leftLine, 4);
    assert.equal(places[1]?.rightLine, 4);
    assert.equal(places[1]?.preview, "a → b");
  });

  it("records only the side that exists for an added block", () => {
    const diff = diffDefinitions("SELECT 1", "SELECT 1\nFROM t\nWHERE a = 1");
    const places = diffPlaces(diff.rows);
    assert.equal(places.length, 1);
    assert.equal(places[0]?.leftLine, null);
    assert.equal(places[0]?.rightLine, 2);
    assert.equal(places[0]?.lineCount, 2);
    assert.equal(places[0]?.preview, "FROM t");
  });
});
