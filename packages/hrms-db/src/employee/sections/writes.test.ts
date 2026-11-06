import assert from "node:assert/strict";
import { describe, it } from "vitest";
import type { SectionFormField } from "./form-fields.ts";
import { previewSectionUpsertDiff } from "./writes.ts";

/** Prisma Decimal uses this tag. Next.js refuses to pass it to a Client Component. */
class Decimal {
  raw: string;

  constructor(raw: string) {
    this.raw = raw;
  }

  toString(): string {
    return this.raw;
  }

  get [Symbol.toStringTag](): string {
    return "Decimal";
  }
}

function field(
  overrides: Partial<SectionFormField> &
    Pick<SectionFormField, "fieldId" | "displayText" | "dbColumn">,
): SectionFormField {
  return {
    sectionId: 6,
    fieldName: overrides.dbColumn,
    displayOrder: overrides.fieldId,
    fieldEntity: "System",
    fieldTypeId: 1,
    fieldType: "Free Text",
    isMandatory: false,
    isValidate: false,
    validationRule: null,
    isHidden: false,
    dbTable: "TPastEmploymentDetails",
    ...overrides,
  };
}

const company = field({
  fieldId: 1,
  displayText: "Company Name",
  dbColumn: "CompanyName",
});

const salary = field({
  fieldId: 2,
  displayText: "Salary On Leaving",
  dbColumn: "LeavingSalary",
  fieldType: "Numeric",
});

describe("previewSectionUpsertDiff", () => {
  it("returns a plain salary string when the stored value is a Decimal", () => {
    const preview = previewSectionUpsertDiff({
      liveTable: "TPastEmploymentDetails",
      entityKey: 2069,
      before: {
        "Company Name": "TDG",
        "Salary On Leaving": new Decimal("40000.00") as unknown as string,
      },
      after: {
        "Company Name": "TDG",
        "Salary On Leaving": 45000,
      },
      fields: [company, salary],
    });

    const salaryRow = preview.find((row) => row.Property === "Salary On Leaving");
    assert.ok(salaryRow);
    assert.equal(salaryRow.Current, "40000.00");
    assert.equal(salaryRow.Proposed, 45000);
    assert.equal(typeof salaryRow.Current, "string");
    assert.deepEqual(JSON.parse(JSON.stringify(preview)), preview);
  });

  it("skips a Decimal salary that matches the submitted number", () => {
    const preview = previewSectionUpsertDiff({
      liveTable: "TPastEmploymentDetails",
      entityKey: 2069,
      before: {
        "Company Name": "TDG",
        "Salary On Leaving": new Decimal("40000.00") as unknown as string,
      },
      after: {
        "Company Name": "Digital Group",
        "Salary On Leaving": 40000,
      },
      fields: [company, salary],
    });

    assert.equal(
      preview.some((row) => row.Property === "Salary On Leaving"),
      false,
    );
    assert.equal(
      preview.find((row) => row.Property === "Company Name")?.Proposed,
      "Digital Group",
    );
  });

  it("leaves the identity column out of the update", () => {
    const id = field({
      fieldId: 3,
      displayText: "Past Employment Id",
      dbColumn: "PastEmploymentId",
    });
    const from = field({
      fieldId: 4,
      displayText: "From",
      dbColumn: "FromDate",
      fieldType: "Date",
    });
    const preview = previewSectionUpsertDiff({
      liveTable: "TPastEmploymentDetails",
      entityKey: 2650,
      before: {
        "Past Employment Id": 1,
        From: "2026-03-09T00:00:00.000Z",
      },
      after: {
        "Past Employment Id": 2650,
        From: "09-Mar-2026",
      },
      fields: [id, from],
    });

    assert.equal(
      preview.some((row) => row.Property === "Past Employment Id"),
      false,
    );
    assert.equal(preview.find((row) => row.Property === "From")?.Proposed, "09-Mar-2026");
  });
});
