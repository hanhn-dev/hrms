import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { appliedColumnFilters } from "./sql-client-filters.ts";

describe("appliedColumnFilters", () => {
  it("drops a blank column or value", () => {
    assert.deepEqual(
      appliedColumnFilters([
        { column: "EmailID", value: "  " },
        { column: " ", value: "ada" },
        { column: "EmployeeId", value: "12" },
      ]),
      [{ column: "EmployeeId", value: "12" }],
    );
  });

  it("keeps one filter per column", () => {
    assert.deepEqual(
      appliedColumnFilters([
        { column: "EmailID", value: "ada" },
        { column: "emailid", value: "zoe" },
      ]),
      [{ column: "emailid", value: "zoe" }],
    );
  });

  it("returns nothing when there are no filters", () => {
    assert.deepEqual(appliedColumnFilters([]), []);
  });
});
