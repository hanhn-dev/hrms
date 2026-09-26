import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  compareEmployerFieldsToTemplate,
  type FieldCatalogRow,
} from "./fields-compare.ts";

function field(
  partial: Partial<FieldCatalogRow> & { fieldId: number; fieldName: string },
): FieldCatalogRow {
  return {
    sectionId: 1,
    section: "Personal Details",
    employerId: partial.employerId ?? 12,
    countryId: 0,
    countryName: null,
    displayText: partial.displayText ?? partial.fieldName,
    displayOrder: 1,
    fieldEntity: "System",
    fieldTypeId: 4,
    fieldType: "Free Text",
    isMandatory: false,
    isValidate: false,
    validationRule: null,
    isHidden: false,
    isActive: true,
    isDefault: false,
    dbTable: "TEmployee",
    dbColumn: partial.fieldName,
    ...partial,
  };
}

describe("compareEmployerFieldsToTemplate", () => {
  it("flags template rows missing on the employer", () => {
    const compared = compareEmployerFieldsToTemplate(
      [],
      [field({ fieldId: 1, fieldName: "FirstName", employerId: 0 })],
    );
    assert.equal(compared.length, 1);
    assert.equal(compared[0]?.status, "missing-on-employer");
    assert.equal(compared[0]?.fieldName, "FirstName");
    assert.equal(compared[0]?.employer, null);
  });

  it("flags employer-only rows as extra", () => {
    const compared = compareEmployerFieldsToTemplate(
      [field({ fieldId: 9, fieldName: "LocalBadge", fieldEntity: "Custom" })],
      [],
    );
    assert.equal(compared.length, 1);
    assert.equal(compared[0]?.status, "extra-on-employer");
    assert.equal(compared[0]?.fieldEntity, "Custom");
    assert.equal(compared[0]?.template, null);
  });

  it("matches on section, field name, country, and entity, ignoring FieldID", () => {
    const compared = compareEmployerFieldsToTemplate(
      [
        field({
          fieldId: 80,
          fieldName: "TaxId",
          fieldEntity: "Country",
          countryId: 3,
          isMandatory: true,
        }),
      ],
      [
        field({
          fieldId: 2,
          fieldName: "TaxId",
          fieldEntity: "country",
          countryId: 3,
          employerId: 0,
          isMandatory: true,
        }),
      ],
    );
    assert.deepEqual(compared, []);
  });

  it("reports property drift without treating a match as extra", () => {
    const compared = compareEmployerFieldsToTemplate(
      [
        field({
          fieldId: 11,
          fieldName: "Email",
          isMandatory: true,
          isValidate: true,
          validationRule: '[{"rule":"email"}]',
          fieldType: "Free Text",
          displayText: "Work Email",
        }),
      ],
      [
        field({
          fieldId: 3,
          fieldName: "Email",
          employerId: 0,
          isMandatory: false,
          isValidate: false,
          validationRule: null,
          fieldType: "Free Text",
          displayText: "Email",
        }),
      ],
    );
    assert.equal(compared.length, 1);
    assert.equal(compared[0]?.status, "drift");
    assert.deepEqual(compared[0]?.driftedProperties, [
      "DisplayText",
      "IsMandatory",
      "IsValidate",
      "ValidationRule",
    ]);
  });

  it("does not match the same employer row to two template rows", () => {
    const compared = compareEmployerFieldsToTemplate(
      [field({ fieldId: 4, fieldName: "Phone" })],
      [
        field({ fieldId: 1, fieldName: "Phone", employerId: 0 }),
        field({ fieldId: 2, fieldName: "Phone", employerId: 0 }),
      ],
    );
    assert.equal(compared.length, 1);
    assert.equal(compared[0]?.status, "missing-on-employer");
    assert.equal(compared[0]?.template?.fieldId, 2);
  });

  it("orders differences by section id ascending", () => {
    const compared = compareEmployerFieldsToTemplate(
      [],
      [
        field({
          fieldId: 2,
          fieldName: "VisaNumber",
          sectionId: 5,
          section: "Visa Details",
          employerId: 0,
        }),
        field({
          fieldId: 1,
          fieldName: "FirstName",
          sectionId: 1,
          section: "Personal Details",
          employerId: 0,
        }),
      ],
    );
    assert.deepEqual(
      compared.map((row) => row.sectionId),
      [1, 5],
    );
  });
});
