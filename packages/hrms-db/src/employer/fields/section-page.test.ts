import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { LIST_PAGE_SIZE } from "../../shared/page.ts";
import { fieldEntitySelection, pageForFieldRow } from "./section-page.ts";

describe("pageForFieldRow", () => {
  it("keeps the first page inside the page size", () => {
    assert.equal(pageForFieldRow(1), 1);
    assert.equal(pageForFieldRow(LIST_PAGE_SIZE), 1);
  });

  it("moves to the next page on the following row", () => {
    assert.equal(pageForFieldRow(LIST_PAGE_SIZE + 1), 2);
    assert.equal(pageForFieldRow(101, 50), 3);
  });

  it("starts at page 1 when the field is missing", () => {
    assert.equal(pageForFieldRow(null), 1);
    assert.equal(pageForFieldRow(undefined), 1);
    assert.equal(pageForFieldRow(0), 1);
  });
});

describe("fieldEntitySelection", () => {
  it("skips the predicate when entities are omitted", () => {
    assert.deepEqual(fieldEntitySelection(undefined), { kind: "all" });
    assert.deepEqual(fieldEntitySelection(null), { kind: "all" });
  });

  it("matches nothing when the selection is empty", () => {
    assert.deepEqual(fieldEntitySelection([]), { kind: "none" });
    assert.deepEqual(fieldEntitySelection(["", "  "]), { kind: "none" });
  });

  it("trims and de-duplicates the selected entities", () => {
    assert.deepEqual(fieldEntitySelection([" System ", "system", "Country"]), {
      kind: "some",
      entities: ["System", "Country"],
    });
  });
});
