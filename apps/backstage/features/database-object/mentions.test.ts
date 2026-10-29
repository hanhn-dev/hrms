import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { mentionSegments, type ObjectKindMap } from "./mentions.ts";

const KINDS: ObjectKindMap = {
  "dbo.temployee": "table",
  "dbo.sp_example": "storedProcedure",
};

describe("mentionSegments", () => {
  it("chips a schema-qualified name and a procedure when the catalog knows them", () => {
    assert.deepEqual(mentionSegments("from dbo.TEmployee join SP_Example", KINDS), [
      { type: "text", text: "from " },
      { type: "object", text: "dbo.TEmployee", schema: "dbo", name: "TEmployee", kind: "table" },
      { type: "text", text: " join " },
      {
        type: "object",
        text: "SP_Example",
        schema: "dbo",
        name: "SP_Example",
        kind: "storedProcedure",
      },
    ]);
  });

  it("leaves ordinary words and system procedures as text", () => {
    assert.deepEqual(mentionSegments("Cannot ROLLBACK sp_executesql", KINDS), [
      { type: "text", text: "Cannot ROLLBACK sp_executesql" },
    ]);
  });

  it("leaves a procedure-shaped name as text when it is missing from the catalog", () => {
    assert.deepEqual(mentionSegments("SP_Missing failed", KINDS), [
      { type: "text", text: "SP_Missing failed" },
    ]);
  });
});
