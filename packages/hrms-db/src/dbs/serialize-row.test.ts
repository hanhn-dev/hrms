import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { serializeRow, serializeSqlValue } from "./serialize-row.ts";

class Decimal {
  raw: string;

  constructor(raw: string) {
    this.raw = raw;
  }

  toString(): string {
    return this.raw;
  }

  get [Symbol.toStringTag](): string {
    return "Decimal";
  }
}

describe("serializeSqlValue", () => {
  it("turns a Decimal into a string", () => {
    assert.equal(serializeSqlValue(new Decimal("12.50")), "12.50");
  });

  it("keeps plain values", () => {
    assert.equal(serializeSqlValue("00006"), "00006");
    assert.equal(serializeSqlValue(6), 6);
    assert.equal(serializeSqlValue(null), null);
  });

  it("serializes a row the client can receive", () => {
    const row = serializeRow({
      Id: 1425,
      EmploymentNumber: "00006",
      PreviousExperience: new Decimal("18.00"),
      CreatedDate: new Date("2026-09-23T02:45:58.000Z"),
    });
    assert.deepEqual(row, {
      Id: 1425,
      EmploymentNumber: "00006",
      PreviousExperience: "18.00",
      CreatedDate: "2026-09-23T02:45:58.000Z",
    });
  });
});
