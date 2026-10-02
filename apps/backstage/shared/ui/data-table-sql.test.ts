import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { formatTableQueryScript } from "./data-table-sql.ts";

describe("formatTableQueryScript", () => {
  it("returns an empty script unchanged", () => {
    assert.deepEqual(formatTableQueryScript(""), { sql: "", warning: null });
    assert.deepEqual(formatTableQueryScript("   "), { sql: "", warning: null });
  });

  it("keeps query headings on their own lines", () => {
    const formatted = formatTableQueryScript(
      "-- query 1\nSELECT 1\n\n-- query 2\nSELECT 2",
    );
    assert.equal(formatted.warning, null);
    assert.match(formatted.sql, /^-- query 1\n/);
    assert.match(formatted.sql, /\n\n-- query 2\n/);
  });

  it("formats a select and keeps a quoted literal", () => {
    const formatted = formatTableQueryScript(
      "SELECT EmployeeId FROM dbo.TEmployee WHERE Name = N'Ann''s'",
    );
    assert.equal(formatted.warning, null);
    assert.match(formatted.sql, /SELECT/);
    assert.match(formatted.sql, /N'Ann''s'/);
  });
});
