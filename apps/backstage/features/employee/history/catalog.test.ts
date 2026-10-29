import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { resolveHistoryScreenFilters } from "./catalog";

describe("resolveHistoryScreenFilters", () => {
  it("shows the default section and latest 90 days", () => {
    assert.deepEqual(
      resolveHistoryScreenFilters({
        now: new Date("2026-09-29T12:00:00.000Z"),
      }),
      {
        section: "Personal Details",
        from: "2026-07-02",
        to: "2026-09-29",
      },
    );
  });

  it("keeps a valid URL section and explicit range", () => {
    assert.deepEqual(
      resolveHistoryScreenFilters({
        section: "Bank Details",
        from: "2024-01-01",
        to: "2026-09-29",
      }),
      {
        section: "Bank Details",
        from: "2024-01-01",
        to: "2026-09-29",
      },
    );
  });

  it("falls back from an invalid section", () => {
    assert.equal(
      resolveHistoryScreenFilters({ section: "Not a section" }).section,
      "Personal Details",
    );
  });
});
