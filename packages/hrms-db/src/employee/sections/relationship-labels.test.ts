import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SectionFormField } from "./form-fields.ts";
import {
  applyRelationshipLabels,
  collectRelationshipIds,
  relationshipDisplayTexts,
} from "./relationship-labels.ts";
import type { SectionRecordRow } from "./records.ts";

function field(displayText: string, dbColumn: string): SectionFormField {
  return {
    fieldId: 1,
    sectionId: 10,
    displayText,
    fieldName: dbColumn,
    displayOrder: 1,
    fieldEntity: "System",
    fieldTypeId: 1,
    fieldType: "Drop Down",
    isMandatory: false,
    isValidate: false,
    validationRule: null,
    isHidden: false,
    dbTable: "TEmployeeFamilyDetails",
    dbColumn,
  };
}

const row: SectionRecordRow = {
  recordKey: "TEmployeeFamilyDetails:9785",
  liveTable: "TEmployeeFamilyDetails",
  entityKey: 9785,
  values: { Relationship: 789, Name: "Aug" },
};

describe("relationship labels", () => {
  it("replaces a relationship id with its name", () => {
    const texts = relationshipDisplayTexts([
      field("Relationship", "Relation"),
      field("Name", "Name"),
    ]);
    assert.deepEqual(texts, ["Relationship"]);
    assert.deepEqual(collectRelationshipIds([row], texts), [789]);
    const labeled = applyRelationshipLabels(
      [row],
      texts,
      new Map([[789, "Brother In Law"]]),
    );
    assert.equal(labeled[0]?.values.Relationship, "Brother In Law");
    assert.equal(labeled[0]?.values.Name, "Aug");
    assert.equal(row.values.Relationship, 789);
  });

  it("leaves a stored name and an unknown id unchanged", () => {
    const named: SectionRecordRow = {
      ...row,
      values: { Relationship: "Spouse", Name: "Ada" },
    };
    const unknown: SectionRecordRow = {
      ...row,
      values: { Relationship: "12" },
    };
    const labeled = applyRelationshipLabels(
      [named, unknown],
      ["Relationship"],
      new Map([[789, "Brother In Law"]]),
    );
    assert.equal(labeled[0]?.values.Relationship, "Spouse");
    assert.equal(labeled[1]?.values.Relationship, "12");
    assert.deepEqual(collectRelationshipIds([], ["Relationship"]), []);
  });
});
