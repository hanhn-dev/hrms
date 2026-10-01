import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { filterCatalogItems, filterDataRows } from "./catalog-view.ts";

const lists = [
  { key: "grade", label: "Grade", table: "TGrade", group: "organization" },
  { key: "country", label: "Country", table: "TCOUNTRY", group: "profile" },
  { key: "designation", label: "Designation", table: "TTitle", group: "organization" },
];

describe("filterCatalogItems", () => {
  it("matches a list by label (positive)", () => {
    assert.deepEqual(
      filterCatalogItems(lists, "grade").map((item) => item.key),
      ["grade"],
    );
  });

  it("returns nothing when nothing matches (negative)", () => {
    assert.deepEqual(filterCatalogItems(lists, "zzzz-no-such"), []);
  });

  it("returns every list for a blank query (edge)", () => {
    assert.equal(filterCatalogItems(lists, "  ").length, lists.length);
  });
});

describe("filterDataRows", () => {
  const rows = [{ Title: "Senior Manager" }, { Title: "Analyst" }];

  it("matches a row by cell text (positive)", () => {
    assert.equal(filterDataRows(rows, "manager").length, 1);
  });

  it("returns nothing when no cell matches (negative)", () => {
    assert.deepEqual(filterDataRows(rows, "zzz"), []);
  });

  it("returns every row for a blank query (edge)", () => {
    assert.deepEqual(filterDataRows(rows, ""), rows);
  });
});
