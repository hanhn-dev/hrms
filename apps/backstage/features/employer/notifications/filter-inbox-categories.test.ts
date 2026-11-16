import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { filterInboxCategories } from "./filter-inbox-categories.ts";
import type { PendingInboxCategory } from "./queries.ts";

const categories: PendingInboxCategory[] = [
  {
    name: "Leave & Attendance",
    total: 100,
    types: [
      { requestType: "LeaveRequest", count: 40 },
      { requestType: "AttendanceOverTime", count: 60 },
    ],
  },
  {
    name: "Other",
    total: 50,
    types: [
      { requestType: "HolidayMaster", count: 18 },
      { requestType: "ShortlistedCandidate", count: 32 },
    ],
  },
];

describe("filterInboxCategories", () => {
  it("returns every category when the query is blank", () => {
    assert.deepEqual(filterInboxCategories(categories, ""), categories);
    assert.deepEqual(filterInboxCategories(categories, "   "), categories);
  });

  it("keeps a whole category when its name matches", () => {
    const next = filterInboxCategories(categories, "leave");
    assert.equal(next.length, 1);
    assert.equal(next[0]?.name, "Leave & Attendance");
    assert.equal(next[0]?.types.length, 2);
  });

  it("filters types inside a category and hides empty ones", () => {
    const next = filterInboxCategories(categories, "holiday");
    assert.equal(next.length, 1);
    assert.equal(next[0]?.name, "Other");
    assert.deepEqual(next[0]?.types, [{ requestType: "HolidayMaster", count: 18 }]);
    assert.equal(next[0]?.total, 50);
  });

  it("matches the humanized request type label", () => {
    const next = filterInboxCategories(categories, "over time");
    assert.equal(next.length, 1);
    assert.deepEqual(next[0]?.types, [
      { requestType: "AttendanceOverTime", count: 60 },
    ]);
  });

  it("returns nothing when nothing matches", () => {
    assert.deepEqual(filterInboxCategories(categories, "zzz"), []);
  });
});
