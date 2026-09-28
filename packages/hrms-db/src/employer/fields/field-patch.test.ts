import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  diffFieldRow,
  formatFieldRowReplaySql,
  formatValidationRuleReplaySql,
  parseFieldRowPatch,
  type FieldRowCurrent,
} from "./field-patch.ts";

function current(
  partial: Partial<FieldRowCurrent> = {},
): FieldRowCurrent {
  return {
    fieldId: 456,
    employerId: 12,
    sectionId: 1,
    countryId: 0,
    fieldName: "Title",
    displayText: "Title",
    fieldEntity: "System",
    fieldTypeId: 4,
    fieldType: "Drop Down",
    isMandatory: false,
    isValidate: true,
    isHidden: false,
    isActive: true,
    isDefault: false,
    validationRule: null,
    ...partial,
  };
}

describe("parseFieldRowPatch", () => {
  it("accepts a complete trimmed patch", () => {
    const patch = parseFieldRowPatch({
      fieldName: "  First Name  ",
      displayText: "First Name",
      fieldEntity: "System",
      fieldTypeId: 2,
      isMandatory: true,
      isValidate: false,
      isHidden: false,
      isActive: true,
    });
    assert.equal(patch.fieldName, "First Name");
    assert.equal(patch.fieldTypeId, 2);
    assert.equal(patch.isMandatory, true);
  });

  it("rejects an empty FieldName", () => {
    assert.throws(
      () =>
        parseFieldRowPatch({
          fieldName: "   ",
          displayText: "Title",
          fieldEntity: "System",
          fieldTypeId: 1,
          isMandatory: false,
          isValidate: false,
          isHidden: false,
          isActive: true,
        }),
      /too_small|expected string/i,
    );
  });
});

describe("diffFieldRow", () => {
  it("returns only changed properties", () => {
    const patch = parseFieldRowPatch({
      fieldName: "Title",
      displayText: "Job Title",
      fieldEntity: "System",
      fieldTypeId: 4,
      isMandatory: false,
      isValidate: true,
      isHidden: true,
      isActive: true,
    });
    const diffs = diffFieldRow(current(), patch, "Drop Down");
    assert.deepEqual(
      diffs.map((row) => row.Property),
      ["DisplayText", "Hidden"],
    );
    assert.equal(diffs[0]?.Proposed, "Job Title");
    assert.equal(diffs[1]?.Proposed, "Yes");
  });
});

describe("formatFieldRowReplaySql", () => {
  it("matches the current FieldName in WHERE when renaming", () => {
    const patch = parseFieldRowPatch({
      fieldName: "JobTitle",
      displayText: "Title",
      fieldEntity: "System",
      fieldTypeId: 4,
      isMandatory: false,
      isValidate: true,
      isHidden: false,
      isActive: true,
    });
    const sql = formatFieldRowReplaySql({
      env: "DEV",
      sourceFieldId: 456,
      current: current(),
      patch,
      updatedBy: 99,
    });
    assert.match(sql, /Fields\.FieldName = N'Title'/);
    assert.match(sql, /Fields\.FieldName = N'JobTitle'/);
    assert.doesNotMatch(sql, /Fields\.FieldID = 456/);
    assert.match(sql, /source FieldID: 456/);
  });

  it("escapes quotes in DisplayText", () => {
    const patch = parseFieldRowPatch({
      fieldName: "Title",
      displayText: "O'Brien",
      fieldEntity: "System",
      fieldTypeId: 4,
      isMandatory: false,
      isValidate: true,
      isHidden: false,
      isActive: true,
    });
    const sql = formatFieldRowReplaySql({
      env: "DEV",
      sourceFieldId: 456,
      current: current(),
      patch,
      updatedBy: 99,
    });
    assert.match(sql, /Fields\.DisplayText = N'O''Brien'/);
  });
});

describe("formatValidationRuleReplaySql", () => {
  it("uses the natural key and escaped JSON", () => {
    const sql = formatValidationRuleReplaySql({
      env: "QA",
      sourceFieldId: 456,
      current: current(),
      validationRule: `[{"rule":"required","error":"O'Hara"}]`,
      updatedBy: 7,
    });
    assert.match(sql, /Fields\.FieldName = N'Title'/);
    assert.match(sql, /O''Hara/);
    assert.match(sql, /Source env: QA/);
    assert.doesNotMatch(sql, /Fields\.FieldID = 456/);
  });
});
