import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SectionFormField } from "./form-fields.ts";
import { groupPendingSectionRecords } from "./pending-records.ts";
import type { SectionRecordRow } from "./records.ts";
import type { PendingSectionDetail } from "./pending-records.ts";

function field(
  overrides: Partial<SectionFormField> &
    Pick<SectionFormField, "fieldId" | "displayText" | "dbTable" | "dbColumn">,
): SectionFormField {
  return {
    sectionId: 10,
    fieldName: overrides.displayText,
    displayOrder: overrides.fieldId,
    fieldEntity: "System",
    fieldTypeId: 1,
    fieldType: "Free Text",
    isMandatory: false,
    isValidate: false,
    validationRule: null,
    isHidden: false,
    ...overrides,
  };
}

const nameField = field({
  fieldId: 1,
  displayText: "Name",
  dbTable: "TEmployeeFamilyDetails",
  dbColumn: "Name",
});

const relationshipField = field({
  fieldId: 2,
  displayText: "Relationship",
  fieldName: "Relation",
  dbTable: "TEmployeeFamilyDetails",
  dbColumn: "Relationship",
});

function detail(
  overrides: Partial<PendingSectionDetail> &
    Pick<PendingSectionDetail, "changeRequestId" | "fieldName">,
): PendingSectionDetail {
  return {
    requestedAt: "2026-10-01T00:00:00.000Z",
    tableName: "TEmployeeFamilyDetails",
    sectionName: "Family Details",
    dbFieldName: null,
    textValueNew: null,
    newValue: null,
    isNew: false,
    childRowId: null,
    ...overrides,
  };
}

const familyTables = ["TEmployeeFamilyDetails"];

const liveRow: SectionRecordRow = {
  recordKey: "TEmployeeFamilyDetails:88",
  liveTable: "TEmployeeFamilyDetails",
  entityKey: 88,
  values: { Name: "Ada", Relationship: "Spouse" },
  lookups: {},
};

describe("groupPendingSectionRecords", () => {
  it("merges an added request into one row using the display text", () => {
    const rows = groupPendingSectionRecords({
      tables: familyTables,
      fields: [nameField, relationshipField],
      liveRecords: [],
      details: [
        detail({
          changeRequestId: 7,
          fieldName: "Name",
          textValueNew: "Ada",
          newValue: "99",
          isNew: true,
        }),
        detail({
          changeRequestId: 7,
          fieldName: "Relation",
          dbFieldName: "Relationship",
          newValue: "Child",
          isNew: true,
        }),
      ],
    });

    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.status, "ADDED");
    assert.equal(rows[0]?.changeRequestId, 7);
    assert.equal(rows[0]?.childRowId, null);
    assert.deepEqual(rows[0]?.values, { Name: "Ada", Relationship: "Child" });
  });

  it("shows a lookup label when the text value is only an id", () => {
    const rows = groupPendingSectionRecords({
      tables: familyTables,
      fields: [relationshipField],
      liveRecords: [],
      details: [
        detail({
          changeRequestId: 11,
          fieldName: "Relation",
          dbFieldName: "Relation",
          textValueNew: "789",
          newValue: "Brother In Law",
          isNew: true,
        }),
      ],
    });

    assert.equal(rows[0]?.values.Relationship, "Brother In Law");
  });

  it("overlays an update onto the matching live row", () => {
    const rows = groupPendingSectionRecords({
      tables: familyTables,
      fields: [nameField, relationshipField],
      liveRecords: [liveRow],
      details: [
        detail({
          changeRequestId: 8,
          fieldName: "Relationship label",
          dbFieldName: "Relationship",
          textValueNew: "Child",
          childRowId: 88,
        }),
      ],
    });

    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.status, "UPDATED");
    assert.deepEqual(rows[0]?.values, { Name: "Ada", Relationship: "Child" });
  });

  it("treats a delete flag as deleted and keeps the live values", () => {
    const rows = groupPendingSectionRecords({
      tables: familyTables,
      fields: [nameField, relationshipField],
      liveRecords: [liveRow],
      details: [
        detail({
          changeRequestId: 9,
          fieldName: "IsDelete",
          newValue: "Y",
          isNew: true,
          childRowId: 88,
        }),
        detail({
          changeRequestId: 9,
          fieldName: "Name",
          textValueNew: "Should not replace",
          isNew: true,
          childRowId: 88,
        }),
      ],
    });

    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.status, "DELETED");
    assert.deepEqual(rows[0]?.values, { Name: "Ada", Relationship: "Spouse" });
  });

  it("drops rows for other section tables and keeps visa on passport", () => {
    const family = groupPendingSectionRecords({
      tables: familyTables,
      fields: [nameField],
      liveRecords: [],
      details: [
        detail({
          changeRequestId: 1,
          fieldName: "Name",
          textValueNew: "Ada",
          isNew: true,
          tableName: "TEducationDetails",
          sectionName: "Education Details",
        }),
      ],
    });
    assert.deepEqual(family, []);

    const passport = groupPendingSectionRecords({
      tables: ["TEmployeePassportDetails", "TEmployeeVisaInfo"],
      fields: [
        field({
          fieldId: 3,
          sectionId: 4,
          displayText: "Visa Number",
          dbTable: "TEmployeeVisaInfo",
          dbColumn: "VisaNumber",
        }),
      ],
      liveRecords: [],
      details: [
        detail({
          changeRequestId: 2,
          fieldName: "Visa Number",
          textValueNew: "V-1",
          isNew: true,
          tableName: "temployeevisainfo",
          sectionName: "Visa Details",
        }),
        detail({
          changeRequestId: 3,
          fieldName: "Name",
          textValueNew: "Ada",
          isNew: true,
          tableName: "TEmployeeFamilyDetails",
          sectionName: "Family Details",
        }),
      ],
    });
    assert.equal(passport.length, 1);
    assert.equal(passport[0]?.liveTable, "TEmployeeVisaInfo");
    assert.equal(passport[0]?.status, "ADDED");
    assert.deepEqual(passport[0]?.values, { "Visa Number": "V-1" });
  });

  it("returns nothing when there are no details", () => {
    assert.deepEqual(
      groupPendingSectionRecords({
        tables: familyTables,
        fields: [nameField],
        liveRecords: [liveRow],
        details: [],
      }),
      [],
    );
    assert.deepEqual(
      groupPendingSectionRecords({
        tables: [],
        fields: [],
        liveRecords: [],
        details: [
          detail({
            changeRequestId: 1,
            fieldName: "Name",
            textValueNew: "Ada",
            isNew: true,
          }),
        ],
      }),
      [],
    );
  });
});
