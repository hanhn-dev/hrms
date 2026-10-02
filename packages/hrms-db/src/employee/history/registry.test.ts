import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PAST_TABLE_SPECS, pastSpecForSection } from "./registry.ts";

describe("PAST_TABLE_SPECS column names", () => {
  it("uses the real emergency, passport, and nominee columns (positive)", () => {
    const emergency = pastSpecForSection("Emergency Contact Details");
    assert.ok(emergency);
    assert.equal(emergency.historyIdColumn, "HistoryTransID");
    assert.equal(emergency.historyTimestampColumn, "UpdatedDateUtcTime");
    assert.equal(emergency.historyEditorColumn, "UpdatedBy");
    assert.equal(emergency.deletedColumn, "Isdeleted");
    assert.equal(emergency.employeeIdColumn, "EmployeeID");

    const passport = pastSpecForSection("Passport Details");
    assert.ok(passport);
    assert.equal(passport.historyIdColumn, "HistoryTransId");
    assert.equal(passport.historyTimestampColumn, "LastUpdatedOnUtcTime");
    assert.equal(passport.historyEditorColumn, "LastUpdatedBy");
    assert.equal(passport.entityKeyColumn, "EmployeeId");

    const nominee = pastSpecForSection("Nominee Details");
    assert.ok(nominee);
    assert.equal(nominee.historyIdColumn, "HistoryID");
    assert.equal(nominee.entityKeyColumn, "EmployeeNomineeId");
    assert.equal(nominee.historyTimestampColumn, "UpdatedDateUtc");
    assert.equal(nominee.historyEditorColumn, "UpdatedBy");
    assert.equal(nominee.deletedColumn, "IsDelete");
    assert.equal(nominee.employeeIdColumn, "EmployeeID");
  });

  it("does not look for a deleted column on passport history (negative)", () => {
    const passport = pastSpecForSection("Passport Details");
    assert.ok(passport);
    assert.equal(passport.deletedColumn, undefined);
    assert.equal(
      passport.skipColumns.some((column) => column.toLowerCase() === "isdelete"),
      false,
    );
  });

  it("returns no spec for an unknown section and keeps education's real id (edge)", () => {
    assert.equal(pastSpecForSection(""), undefined);
    assert.equal(pastSpecForSection("Not A Section"), undefined);

    const education = pastSpecForSection("Education Details");
    assert.ok(education);
    assert.equal(education.historyIdColumn, "EducationhistoryId");
    assert.equal(education.historyTimestampColumn, "UpdatedDateUtc");
    assert.equal(education.historyEditorColumn, "LastUpdatedBy");

    const names = PAST_TABLE_SPECS.map((spec) => spec.sectionName);
    assert.equal(new Set(names).size, names.length);
  });
});
