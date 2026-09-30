import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { matchRanges } from "./match-ranges.ts";

describe("matchRanges", () => {
  it("marks each word in an object name", () => {
    assert.deepEqual(
      matchRanges("SP_Mydetails_ProcessEmployeeBankDetails", "My Details Bank"),
      [
        [3, 12],
        [28, 39],
      ],
    );
  });

  it("merges a short word that sits inside a longer word", () => {
    assert.deepEqual(matchRanges("BankDetails", "De Details"), [[4, 11]]);
  });

  it("drops words shorter than 2 characters", () => {
    assert.deepEqual(matchRanges("BankDetails", "X Bank"), [[0, 4]]);
    assert.deepEqual(matchRanges("BankDetails", "a b"), []);
  });

  it("returns nothing when the text has no match", () => {
    assert.deepEqual(matchRanges("SP_GetEmployee", "Bank"), []);
    assert.deepEqual(matchRanges("", "Bank"), []);
  });
});
