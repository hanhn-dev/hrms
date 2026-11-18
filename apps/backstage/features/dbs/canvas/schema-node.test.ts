import assert from "node:assert/strict";
import { describe, it } from "vitest";
import type { DatabaseColumn } from "@/features/dbs/queries";
import { columnsForExpandedNode } from "@/features/dbs/canvas/schema-node";

function column(name: string): DatabaseColumn {
  return {
    name,
    dataType: "int",
    nullable: false,
    primaryKey: false,
  };
}

describe("columnsForExpandedNode", () => {
  it("returns the full list when many columns are present", () => {
    const columns = Array.from({ length: 70 }, (_, index) =>
      column(`Col${index + 1}`),
    );
    const result = columnsForExpandedNode(columns);
    assert.equal(result.length, 70);
    assert.equal(result[0]?.name, "Col1");
    assert.equal(result[69]?.name, "Col70");
  });

  it("returns an empty list for undefined or empty input", () => {
    assert.deepEqual(columnsForExpandedNode(undefined), []);
    assert.deepEqual(columnsForExpandedNode([]), []);
  });
});
