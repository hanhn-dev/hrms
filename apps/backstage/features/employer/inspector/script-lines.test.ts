import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { originalLineAt, originalLineForDisplayedLines } from "./script-lines.ts";

describe("originalLineForDisplayedLines", () => {
  it("numbers identical text, including a blank line", () => {
    assert.deepEqual(originalLineForDisplayedLines("SELECT a\n\nFROM t", "SELECT a\n\nFROM t"), [
      1, 2, 3,
    ]);
  });

  it("keeps line numbers when only carriage returns differ", () => {
    assert.deepEqual(
      originalLineForDisplayedLines("SELECT a\r\n\r\nFROM t", "SELECT a\n\nFROM t"),
      [1, 2, 3],
    );
  });

  it("shares one original line across wrapped formatted lines", () => {
    assert.deepEqual(
      originalLineForDisplayedLines("SELECT a FROM t", "SELECT\n  a\nFROM\n  t"),
      [1, 1, 1, 1],
    );
  });

  it("leaves a formatter-inserted blank line empty", () => {
    assert.deepEqual(
      originalLineForDisplayedLines("SELECT a FROM t", "SELECT\n  a\n\nFROM\n  t"),
      [1, 1, null, 1, 1],
    );
  });

  it("leaves lines after a non-whitespace mismatch empty", () => {
    assert.deepEqual(originalLineForDisplayedLines("SELECT a\nFROM t", "SELECT b\nFROM t"), [
      1,
      null,
    ]);
  });
});

describe("originalLineAt", () => {
  it("reads a displayed line and ignores a missing one", () => {
    const lines = [1, null, 4];
    assert.equal(originalLineAt(lines, 1), 1);
    assert.equal(originalLineAt(lines, 2), null);
    assert.equal(originalLineAt(lines, null), null);
    assert.equal(originalLineAt(lines, 9), null);
  });
});
