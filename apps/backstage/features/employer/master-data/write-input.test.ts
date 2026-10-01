import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { parseMasterDataWriteInput } from "./write-input.ts";

describe("parseMasterDataWriteInput", () => {
  it("accepts an employer-scoped update (positive)", () => {
    const parsed = parseMasterDataWriteInput({
      employerId: 10,
      key: "grade",
      mode: "update",
      id: 4,
      values: { GradeName: "L1" },
    });
    assert.equal(parsed.employerId, 10);
    assert.equal(parsed.key, "grade");
  });

  it("rejects a missing employer id (negative)", () => {
    assert.throws(
      () =>
        parseMasterDataWriteInput({
          key: "grade",
          mode: "insert",
          id: null,
          values: { GradeName: "L1" },
        }),
      /employerId/,
    );
  });

  it("rejects a zero employer id (edge)", () => {
    assert.throws(
      () =>
        parseMasterDataWriteInput({
          employerId: 0,
          key: "country",
          mode: "delete",
          id: 1,
          values: {},
        }),
      /employerId/,
    );
  });
});
