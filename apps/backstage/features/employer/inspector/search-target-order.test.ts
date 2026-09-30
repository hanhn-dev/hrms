import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  orderSearchTargets,
  type OrderedSearchTarget,
} from "./search-target-order.ts";

function target(
  name: string,
  referenceCount: number,
  hasEmployerColumn = true,
): OrderedSearchTarget {
  return { schema: "dbo", name, hasEmployerColumn, referenceCount };
}

describe("orderSearchTargets", () => {
  it("searches heavily referenced tables before rarely referenced ones", () => {
    const ordered = orderSearchTargets(
      [
        target("TArchiveCopy", 1),
        target("TEmployee", 40),
        target("TLookup", 12),
      ],
      true,
    );

    assert.deepEqual(
      ordered.map((row) => row.name),
      ["TEmployee", "TLookup", "TArchiveCopy"],
    );
  });

  it("keeps employer tables ahead of a more referenced global table", () => {
    const ordered = orderSearchTargets(
      [
        target("TCountry", 80, false),
        target("TEmployeeInfo", 4, true),
      ],
      true,
    );

    assert.deepEqual(
      ordered.map((row) => row.name),
      ["TEmployeeInfo", "TCountry"],
    );
  });

  it("uses the shorter name when reference counts match", () => {
    const ordered = orderSearchTargets(
      [target("TEmployeeInfoHistoryExtra", 3), target("TEmployee", 3)],
      false,
    );

    assert.deepEqual(
      ordered.map((row) => row.name),
      ["TEmployee", "TEmployeeInfoHistoryExtra"],
    );
  });
});
