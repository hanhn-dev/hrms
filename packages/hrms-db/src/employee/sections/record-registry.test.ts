import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  SECTION_RECORD_SPECS,
  isCrudSectionId,
  sectionRecordSpecForId,
  tableSpecFor,
} from "./record-registry.ts";
import { SECTION_COUNT_SPECS } from "./specs.ts";

describe("SECTION_RECORD_SPECS", () => {
  it("excludes Personal and Employment", () => {
    assert.equal(isCrudSectionId(1), false);
    assert.equal(isCrudSectionId(14), false);
    assert.equal(sectionRecordSpecForId(1), undefined);
    assert.equal(sectionRecordSpecForId(14), undefined);
  });

  it("covers every multi-record count section", () => {
    const multi = SECTION_COUNT_SPECS.filter(
      (s) => s.source !== "employee-presence",
    );
    for (const count of multi) {
      const rec = sectionRecordSpecForId(count.sectionId);
      assert.ok(rec, `missing CRUD spec for ${count.sectionName}`);
      assert.equal(rec!.sectionName, count.sectionName);
      assert.equal(rec!.label, count.label);
      assert.ok(rec!.tables.length > 0);
    }
  });

  it("passport section includes passport and visa tables", () => {
    const passport = sectionRecordSpecForId(4)!;
    assert.equal(passport.tables.length, 2);
    assert.ok(
      passport.tables.some((t) => t.liveTable === "TEmployeePassportDetails"),
    );
    assert.ok(passport.tables.some((t) => t.liveTable === "TEmployeeVisaInfo"));
    assert.equal(
      tableSpecFor(4, "TEmployeePassportDetails")?.softDelete.kind,
      "none",
    );
    assert.equal(
      tableSpecFor(4, "TEmployeeVisaInfo")?.softDelete.kind,
      "yn",
    );
  });

  it("stamps past employment with the live audit columns", () => {
    const past = sectionRecordSpecForId(6)!;
    assert.equal(past.tables[0]?.liveTable, "TPastEmploymentDetails");
    assert.equal(past.tables[0]?.audit?.updatedBy, "LastModifyBy");
    assert.equal(past.tables[0]?.audit?.updatedAt, "LastModifyOn");
    assert.equal(past.tables[0]?.audit?.updatedAtUtc, "UpdatedDateUtc");
  });

  it("uses the nominee table primary key", () => {
    const nominee = sectionRecordSpecForId(17)!;
    assert.equal(nominee.tables[0]?.entityKeyColumn, "EmployeeNomineeId");
    assert.equal(nominee.tables[0]?.audit?.updatedBy, "UpdatedBy");
    assert.equal(nominee.tables[0]?.audit?.updatedAtUtc, "UpdatedDateUtc");
  });

  it("has unique section ids", () => {
    const ids = SECTION_RECORD_SPECS.map((s) => s.sectionId);
    assert.equal(new Set(ids).size, ids.length);
  });
});
