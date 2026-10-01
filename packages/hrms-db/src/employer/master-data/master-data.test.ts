import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MASTER_DATA_CATALOG,
  masterDataEmployerId,
  requireMasterDataEntry,
} from "./catalog.ts";
import { filterMasterDataCatalog, filterMasterDataRows } from "./search.ts";
import { parseMasterDataValues } from "./values.ts";

describe("master data catalog search", () => {
  it("matches a list by label (positive)", () => {
    const matches = filterMasterDataCatalog(MASTER_DATA_CATALOG, "grade");
    assert.equal(matches.some((entry) => entry.key === "grade"), true);
  });

  it("returns nothing when nothing matches (negative)", () => {
    assert.deepEqual(filterMasterDataCatalog(MASTER_DATA_CATALOG, "zzzz-no-such"), []);
  });

  it("returns every list for a blank query (edge)", () => {
    assert.equal(filterMasterDataCatalog(MASTER_DATA_CATALOG, "  ").length, MASTER_DATA_CATALOG.length);
    assert.equal(filterMasterDataCatalog(MASTER_DATA_CATALOG, "").length, MASTER_DATA_CATALOG.length);
  });
});

describe("master data row search", () => {
  const rows = [{ Title: "Senior Manager" }, { Title: "Analyst" }];

  it("matches a row by cell text (positive)", () => {
    assert.deepEqual(filterMasterDataRows(rows, "manager"), [{ Title: "Senior Manager" }]);
  });

  it("returns nothing when no cell matches (negative)", () => {
    assert.deepEqual(filterMasterDataRows(rows, "zzz"), []);
  });

  it("returns every row for a blank query (edge)", () => {
    assert.deepEqual(filterMasterDataRows(rows, "   "), rows);
  });
});

describe("master data employer scope", () => {
  it("requires the employer id for an employer-scoped list (positive)", () => {
    assert.equal(masterDataEmployerId(requireMasterDataEntry("grade"), 10), 10);
    assert.equal(masterDataEmployerId(requireMasterDataEntry("location"), 4), 4);
    assert.equal(masterDataEmployerId(requireMasterDataEntry("designation"), 4), 4);
  });

  it("does not filter a global list by employer (negative)", () => {
    assert.equal(masterDataEmployerId(requireMasterDataEntry("country"), 10), null);
  });

  it("rejects a missing employer id (edge)", () => {
    assert.throws(
      () => masterDataEmployerId(requireMasterDataEntry("grade"), 0),
      /Employer id is required/,
    );
  });
});

describe("master data writes", () => {
  it("accepts an allowlisted column (positive)", () => {
    const values = parseMasterDataValues(
      requireMasterDataEntry("grade"),
      { GradeName: "L1" },
      "insert",
    );
    assert.equal(values.GradeName, "L1");
  });

  it("refuses a column that is not on the allowlist (negative)", () => {
    assert.throws(
      () =>
        parseMasterDataValues(
          requireMasterDataEntry("designation"),
          { Title: "Engineer", Salary: "1" },
          "update",
        ),
      /Salary is not editable on Designation/,
    );
  });

  it("rejects a blank required name on insert (edge)", () => {
    assert.throws(
      () =>
        parseMasterDataValues(
          requireMasterDataEntry("country"),
          { ISO: "IN", NAME: "  ", NICENAME: "India", PHONECODE: 91 },
          "insert",
        ),
      /Country is required/,
    );
  });
});
