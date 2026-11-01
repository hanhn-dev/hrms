import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { pageRowCountLabel, pageSizeChoices, showPageSize } from "./data-table-page";

describe("pageRowCountLabel", () => {
  it("uses the plural for an empty page", () => {
    assert.equal(pageRowCountLabel(0), "0 rows");
  });

  it("uses the singular for one row", () => {
    assert.equal(pageRowCountLabel(1), "1 row");
  });

  it("counts a full page", () => {
    assert.equal(pageRowCountLabel(25), "25 rows");
  });
});

describe("showPageSize", () => {
  it("hides the size control when the table is empty", () => {
    assert.equal(showPageSize(0), false);
  });

  it("shows the size control when the table has rows", () => {
    assert.equal(showPageSize(1), true);
    assert.equal(showPageSize(8), true);
  });
});

describe("pageSizeChoices", () => {
  it("offers 25, 50, 100, and 200", () => {
    assert.deepEqual(pageSizeChoices(25), [25, 50, 100, 200]);
  });

  it("keeps a size the table already uses", () => {
    assert.deepEqual(pageSizeChoices(20), [20, 25, 50, 100, 200]);
  });
});
