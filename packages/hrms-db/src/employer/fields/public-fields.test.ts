import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  LOCKED_PUBLIC_FIELD_REASON,
  NOT_PUBLIC_FIELD_REASON,
  formatClearPublicFieldReplaySql,
  isLockedPublicFieldName,
  publicFieldClearBlockReason,
  type PublicFieldKey,
} from "./public-fields.ts";

function current(partial: Partial<PublicFieldKey> = {}): PublicFieldKey {
  return {
    fieldId: 456,
    employerId: 12,
    sectionId: 1,
    countryId: 0,
    fieldName: "Blood Group",
    fieldEntity: "System",
    isPublic: true,
    ...partial,
  };
}

describe("isLockedPublicFieldName", () => {
  it("locks the four fields Employee Field Configuration keeps public", () => {
    assert.equal(isLockedPublicFieldName("Designation"), true);
    assert.equal(isLockedPublicFieldName(" BusinessUnit "), true);
    assert.equal(isLockedPublicFieldName("First Name"), true);
    assert.equal(isLockedPublicFieldName("Last Name"), true);
  });

  it("leaves other names clearable", () => {
    assert.equal(isLockedPublicFieldName("Blood Group"), false);
    assert.equal(isLockedPublicFieldName("Business Unit"), false);
    assert.equal(isLockedPublicFieldName(null), false);
    assert.equal(isLockedPublicFieldName(""), false);
  });
});

describe("publicFieldClearBlockReason", () => {
  it("refuses a field that is not public", () => {
    assert.equal(
      publicFieldClearBlockReason({ fieldName: "Blood Group", isPublic: 0 }),
      NOT_PUBLIC_FIELD_REASON,
    );
    assert.equal(
      publicFieldClearBlockReason({ fieldName: "Blood Group", isPublic: null }),
      NOT_PUBLIC_FIELD_REASON,
    );
  });

  it("refuses a locked public field", () => {
    assert.equal(
      publicFieldClearBlockReason({ fieldName: "First Name", isPublic: 1 }),
      LOCKED_PUBLIC_FIELD_REASON,
    );
  });

  it("allows a public field that is not locked", () => {
    assert.equal(
      publicFieldClearBlockReason({ fieldName: "Blood Group", isPublic: "1" }),
      null,
    );
  });
});

describe("formatClearPublicFieldReplaySql", () => {
  it("clears IsPublic by natural key and snapshots config history", () => {
    const sql = formatClearPublicFieldReplaySql({
      env: "DEV",
      sourceFieldId: 456,
      current: current({ fieldName: "O'Brien" }),
      updatedBy: 99,
    });
    assert.match(sql, /Fields\.IsPublic = 0/);
    assert.match(sql, /TEmployeeDetail_FieldsConfigHistory/);
    assert.match(sql, /Fields\.DisplayText/);
    assert.match(sql, /Fields\.FieldName = N'O''Brien'/);
    assert.match(sql, /ISNULL\(Fields\.IsPublic, 0\) = 1/);
    assert.match(sql, /Fields\.UpdatedBy = 99/);
    assert.match(sql, /Source env: DEV/);
    assert.match(sql, /source FieldID: 456/);
    assert.doesNotMatch(sql, /Fields\.FieldID = 456/);
  });

  it("refuses a locked public field", () => {
    assert.throws(
      () =>
        formatClearPublicFieldReplaySql({
          env: "DEV",
          sourceFieldId: 1,
          current: current({ fieldName: "Designation" }),
          updatedBy: 1,
        }),
      new RegExp(LOCKED_PUBLIC_FIELD_REASON),
    );
  });

  it("refuses a field that is not public", () => {
    assert.throws(
      () =>
        formatClearPublicFieldReplaySql({
          env: "DEV",
          sourceFieldId: 1,
          current: current({ isPublic: false }),
          updatedBy: 1,
        }),
      new RegExp(NOT_PUBLIC_FIELD_REASON),
    );
  });
});
