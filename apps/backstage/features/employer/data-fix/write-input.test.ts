import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { parseDataFixWriteInput } from "./write-input.ts";

describe("parseDataFixWriteInput", () => {
  it("accepts an employer-scoped column update", () => {
    const parsed = parseDataFixWriteInput({
      employerId: 10,
      schema: "dbo",
      table: "TEmployee",
      column: "EmailID",
      matchNull: false,
      matchText: "old@tdg.com",
      setNull: false,
      newText: "new@tdg.com",
      employmentNumber: null,
    });
    assert.equal(parsed.table, "TEmployee");
    assert.equal(parsed.column, "EmailID");
  });

  it("rejects a missing employer id", () => {
    assert.throws(
      () =>
        parseDataFixWriteInput({
          schema: "dbo",
          table: "TEmployee",
          column: "EmailID",
          matchNull: true,
          matchText: null,
          setNull: false,
          newText: "next",
          employmentNumber: null,
        }),
      /employerId/,
    );
  });

  it("rejects a blank table name", () => {
    assert.throws(
      () =>
        parseDataFixWriteInput({
          employerId: 10,
          schema: "dbo",
          table: "  ",
          column: "EmailID",
          matchNull: false,
          matchText: "old",
          setNull: true,
          newText: null,
          employmentNumber: null,
        }),
      /table/,
    );
  });
});
