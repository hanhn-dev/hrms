import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseExactNumeric } from "./exact-numeric.ts";

describe("parseExactNumeric", () => {
  it("accepts canonical numeric literals", () => {
    assert.equal(parseExactNumeric("0"), 0);
    assert.equal(parseExactNumeric("6"), 6);
    assert.equal(parseExactNumeric("10"), 10);
    assert.equal(parseExactNumeric("6.5"), 6.5);
    assert.equal(parseExactNumeric("-6"), -6);
    assert.equal(parseExactNumeric("0.5"), 0.5);
    assert.equal(parseExactNumeric(" 10 "), 10);
  });

  it("rejects padded digit strings so they stay string comparisons", () => {
    assert.equal(parseExactNumeric("00006"), null);
    assert.equal(parseExactNumeric("00"), null);
    assert.equal(parseExactNumeric("01"), null);
    assert.equal(parseExactNumeric("00.5"), null);
    assert.equal(parseExactNumeric("-01"), null);
  });

  it("rejects non-numeric text", () => {
    assert.equal(parseExactNumeric(""), null);
    assert.equal(parseExactNumeric("abc"), null);
    assert.equal(parseExactNumeric("6."), null);
    assert.equal(parseExactNumeric(".5"), null);
  });
});
