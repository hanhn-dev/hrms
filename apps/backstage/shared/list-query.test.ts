import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { listHref, readListPage, readListSearch } from "./list-query";

describe("readListPage", () => {
  it("starts at page 1 when the query omits a page", () => {
    assert.equal(readListPage(undefined), 1);
    assert.equal(readListPage(""), 1);
    assert.equal(readListPage("0"), 1);
  });

  it("reads a later page", () => {
    assert.equal(readListPage("2"), 2);
    assert.equal(readListPage(["4"]), 4);
  });
});

describe("readListSearch", () => {
  it("ignores an empty or one-character search", () => {
    assert.equal(readListSearch(undefined), null);
    assert.equal(readListSearch(""), null);
    assert.equal(readListSearch("a"), null);
  });

  it("keeps a search of at least two characters", () => {
    assert.equal(readListSearch(" an "), "an");
  });
});

describe("listHref", () => {
  it("omits page 1 and an empty search", () => {
    assert.equal(listHref("/employers/1/employees", { page: 1, q: null }), "/employers/1/employees");
  });

  it("uses another name when page already means something else", () => {
    assert.equal(
      listHref(
        "/employers/1/workflows",
        { page: 2, q: "leave" },
        { tab: "pages", page: "Leave Approval" },
        { pageParam: "p" },
      ),
      "/employers/1/workflows?tab=pages&page=Leave+Approval&q=leave&p=2",
    );
  });

  it("writes page and search", () => {
    assert.equal(
      listHref("/employers/1/employees", { page: 2, q: "ann" }, { tab: "jobs" }),
      "/employers/1/employees?tab=jobs&q=ann&page=2",
    );
  });
});
