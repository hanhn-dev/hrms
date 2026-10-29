import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  LIST_PAGE_MAX,
  LIST_PAGE_SIZE,
  pageOf,
  pageQuery,
  likeContains,
  searchText,
  totalCountOf,
} from "./page.ts";

describe("pageOf", () => {
  it("starts at page 1 when the caller omits a page", () => {
    assert.equal(pageOf(undefined), 1);
    assert.equal(pageOf(null), 1);
    assert.equal(pageOf(0), 1);
    assert.equal(pageOf(1.5), 1);
  });

  it("clamps a page past the maximum", () => {
    assert.equal(pageOf(LIST_PAGE_MAX + 1), LIST_PAGE_MAX);
    assert.equal(pageOf(3), 3);
  });
});

describe("pageQuery", () => {
  it("offsets an empty search onto the first page, not the whole table", () => {
    assert.deepEqual(pageQuery(undefined), {
      page: 1,
      pageSize: LIST_PAGE_SIZE,
      offset: 0,
    });
  });

  it("offsets later pages by the fixed page size", () => {
    assert.equal(pageQuery(2).offset, LIST_PAGE_SIZE);
  });
});

describe("searchText", () => {
  it("ignores an empty search", () => {
    assert.equal(searchText(undefined), null);
    assert.equal(searchText(""), null);
    assert.equal(searchText("  "), null);
  });

  it("ignores a one-character search", () => {
    assert.equal(searchText("a"), null);
    assert.equal(searchText(" a "), null);
  });

  it("keeps a search of at least two characters", () => {
    assert.equal(searchText(" ab "), "ab");
  });
});

describe("likeContains", () => {
  it("escapes LIKE wildcards", () => {
    assert.equal(likeContains("a_b%"), "%a[_]b[%]%");
  });
});

describe("totalCountOf", () => {
  it("reads a bigint count from SQL", () => {
    assert.equal(totalCountOf(12n), 12);
    assert.equal(totalCountOf(null), 0);
  });
});
