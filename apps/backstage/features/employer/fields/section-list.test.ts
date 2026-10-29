import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  DEFAULT_FIELD_ENTITIES,
  fieldLinkOpenKey,
  fieldSectionTotal,
  sameEntitySelection,
  sectionAccordionKey,
  sectionTableIsOpen,
  sectionTablePagination,
} from "./section-list";

describe("section accordion", () => {
  it("sums section counts and keys a missing section id", () => {
    assert.equal(fieldSectionTotal([]), 0);
    assert.equal(
      fieldSectionTotal([{ fieldCount: 47 }, { fieldCount: 3 }]),
      50,
    );
    assert.equal(sectionAccordionKey(null), "none");
    assert.equal(sectionAccordionKey(4), "4");
  });

  it("loads a table only for an open section", () => {
    assert.equal(sectionTableIsOpen([], "1"), false);
    assert.equal(sectionTableIsOpen(["2"], "1"), false);
    assert.equal(sectionTableIsOpen(["1"], "1"), true);
  });

  it("opens the field link once, then stays closed", () => {
    assert.equal(fieldLinkOpenKey(true, 1, true), "1");
    assert.equal(fieldLinkOpenKey(true, null, true), "none");
    assert.equal(fieldLinkOpenKey(false, 1, true), null);
    assert.equal(fieldLinkOpenKey(true, 1, false), null);
  });

  it("treats the default entities as the same selection in any order", () => {
    assert.equal(sameEntitySelection([], []), true);
    assert.equal(
      sameEntitySelection(["Country", "System", "Custom"], DEFAULT_FIELD_ENTITIES),
      true,
    );
    assert.equal(sameEntitySelection(["System"], DEFAULT_FIELD_ENTITIES), false);
  });
});

describe("sectionTablePagination", () => {
  it("hides the pager when the section fits on one page", () => {
    assert.equal(sectionTablePagination(null, () => undefined), false);
    assert.equal(
      sectionTablePagination({ page: 1, pageSize: 50, totalCount: 47 }, () => undefined),
      false,
    );
  });

  it("pages inside the section when the count exceeds the page size", () => {
    const pagination = sectionTablePagination(
      { page: 2, pageSize: 50, totalCount: 51 },
      () => undefined,
    );
    assert.notEqual(pagination, false);
    if (pagination === false) {
      return;
    }
    assert.equal(pagination.current, 2);
    assert.equal(pagination.total, 51);
    assert.equal(pagination.showSizeChanger, false);
  });
});
