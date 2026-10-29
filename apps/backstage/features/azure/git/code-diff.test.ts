import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { diffCode, type DiffSpan } from "./code-diff.ts";

function changedText(spans: DiffSpan[] | null): string {
  return (spans ?? [])
    .filter((span) => span.changed)
    .map((span) => span.text)
    .join("");
}

describe("diffCode", () => {
  it("returns nothing when both sides are empty", () => {
    const diff = diffCode("", "");
    assert.equal(diff.identical, true);
    assert.equal(diff.addedLineCount, 0);
    assert.equal(diff.removedLineCount, 0);
    assert.deepEqual(diff.hunks, []);
  });

  it("treats identical text as unchanged", () => {
    const diff = diffCode("const name = 1;\n", "const name = 1;\r\n");
    assert.equal(diff.identical, true);
    assert.equal(diff.hunks.length, 0);
  });

  it("shows an added line without the rest of an empty left side", () => {
    const diff = diffCode("", "hello\n");
    assert.equal(diff.identical, false);
    assert.equal(diff.addedLineCount, 1);
    assert.equal(diff.removedLineCount, 0);
    assert.equal(diff.hunks.length, 1);
    const row = diff.hunks[0]?.rows.find((candidate) => candidate.kind === "added");
    assert.equal(row?.left, null);
    assert.equal(row?.leftLine, null);
    assert.equal(changedText(row?.right ?? null), "hello");
  });

  it("highlights only the word that changed inside a line", () => {
    const diff = diffCode("const name = 1;\n", "const name = 2;\n");
    assert.equal(diff.identical, false);
    const row = diff.hunks[0]?.rows.find((candidate) => candidate.kind === "changed");
    assert.ok(row);
    assert.match(changedText(row.left), /1/);
    assert.match(changedText(row.right), /2/);
    assert.doesNotMatch(changedText(row.left), /const/);
    assert.equal(row.leftLine, 1);
    assert.equal(row.rightLine, 1);
  });

  it("keeps a few lines of context around a change in a long file", () => {
    const left = Array.from({ length: 40 }, (_, index) => `line ${index + 1}`).join("\n");
    const right = left.replace("line 20", "line changed");
    const diff = diffCode(`${left}\n`, `${right}\n`);
    const rowCount = diff.hunks.reduce((sum, hunk) => sum + hunk.rows.length, 0);
    assert.ok(rowCount < 20);
    assert.ok(diff.hunks[0]?.rows.some((row) => row.kind === "equal"));
    assert.ok(diff.hunks[0]?.rows.some((row) => row.kind === "changed"));
  });
});
