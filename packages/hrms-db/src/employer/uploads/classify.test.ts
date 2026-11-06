import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  combineCreationUploadSections,
  compareUploadHeaders,
  composeEmployeeName,
  creationExcludedFieldNames,
  isExpiredUpload,
  isMissingObjectError,
  isStuckStatus,
  missingObjectName,
  parseSectionDataRows,
  parseSectionRows,
  parseUploadTypeKey,
  unionFieldsCsv,
  validationRuleNames,
} from "./classify.ts";

describe("isMissingObjectError", () => {
  it("matches Prisma raw-query missing-table text", () => {
    const error = new Error(
      "Invalid `prisma.$queryRaw()` invocation:\n\nRaw query failed. Code: `EREQUEST`. Message: `Invalid object name 'dbo.TBulkUpdateProfile_ExecutionLog'.`",
    );
    assert.equal(isMissingObjectError(error), true);
  });

  it("ignores unrelated query failures", () => {
    assert.equal(isMissingObjectError(new Error("Timeout expired")), false);
  });
});

describe("missingObjectName", () => {
  it("reads the object from a Prisma raw-query failure", () => {
    const error = new Error(
      "Invalid `prisma.$queryRaw()` invocation:\n\nRaw query failed. Code: 'EREQUEST'. Message: 'Invalid object name 'dbo.TEmployeeNominee_Details'.'",
    );
    assert.equal(missingObjectName(error), "dbo.TEmployeeNominee_Details");
  });

  it("returns null for unrelated failures", () => {
    assert.equal(missingObjectName(new Error("Timeout expired")), null);
  });
});

describe("parseUploadTypeKey", () => {
  it("accepts short keys and database UploadType values", () => {
    assert.equal(parseUploadTypeKey("creation"), "creation");
    assert.equal(parseUploadTypeKey("BulkCreation"), "creation");
    assert.equal(parseUploadTypeKey("BulkProfileUpdate"), "profile");
    assert.equal(parseUploadTypeKey("BulkImageUpdate"), "image");
    assert.equal(parseUploadTypeKey("other"), null);
  });
});

describe("validationRuleNames", () => {
  it("extracts rule names from a ValidationRule array", () => {
    assert.deepEqual(
      validationRuleNames(
        '[{"rule":"required"},{"rule":"existInDatabase","params":{"table":"TTitle"}}]',
      ),
      ["required", "existInDatabase"],
    );
  });

  it("returns an empty list for malformed JSON", () => {
    assert.deepEqual(validationRuleNames("[{"), []);
  });
});

describe("compareUploadHeaders", () => {
  it("flags headers that no longer match the catalog DisplayText", () => {
    const compared = compareUploadHeaders(
      "Work Email,First Name,Old Header",
      ["Work Email", "First Name", "Date of Joining"],
    );
    assert.deepEqual(compared.matched, ["Work Email", "First Name"]);
    assert.deepEqual(compared.extraInFile, ["Old Header"]);
    assert.deepEqual(compared.missingInCatalog, ["Date of Joining"]);
  });

  it("matches headers case-insensitively", () => {
    const compared = compareUploadHeaders("work email", ["Work Email"]);
    assert.deepEqual(compared.matched, ["work email"]);
    assert.deepEqual(compared.extraInFile, []);
    assert.deepEqual(compared.missingInCatalog, []);
  });
});

describe("parseSectionRows", () => {
  it("classifies validation and processing fields from Section_JSON", () => {
    const parsed = parseSectionRows(
      JSON.stringify([
        {
          ID: 12,
          "Work Email": "a@b.com",
          isValid: false,
          errorFields: [{ fieldName: "PAN Number", message: "Required." }],
          unprocessedReasons: [],
        },
        {
          ID: 13,
          isValid: true,
          isProcessed: false,
          unprocessedReasons: ["Employment Type cannot be changed."],
        },
      ]),
    );
    assert.equal(parsed.parseError, null);
    assert.equal(parsed.rows[0]?.employeeId, 12);
    assert.equal(parsed.rows[0]?.workEmail, "a@b.com");
    assert.equal(parsed.rows[0]?.errorFields[0]?.fieldName, "PAN Number");
    assert.equal(parsed.rows[0]?.errorFields[0]?.message, "Required.");
    assert.deepEqual(parsed.rows[1]?.unprocessedReasons, [
      "Employment Type cannot be changed.",
    ]);
  });

  it("reads field errors from the stored errors array", () => {
    const parsed = parseSectionRows(
      JSON.stringify([
        {
          ID: 12,
          isValid: false,
          errorFields: [
            { fieldName: "Account Number", errors: ["This field can't be empty."] },
          ],
        },
      ]),
    );
    assert.equal(parsed.rows[0]?.errorFields[0]?.fieldName, "Account Number");
    assert.equal(parsed.rows[0]?.errorFields[0]?.message, "This field can't be empty.");
  });

  it("returns a parse error for invalid JSON", () => {
    const parsed = parseSectionRows("{not-json");
    assert.equal(parsed.rows.length, 0);
    assert.equal(parsed.parseError, "Section_JSON is not valid JSON.");
  });
});

describe("composeEmployeeName", () => {
  it("prefers Employee Name when present", () => {
    assert.equal(
      composeEmployeeName({
        "Employee Name": "Pat Lee",
        "First Name": "Ignored",
        "Last Name": "Ignored",
      }),
      "Pat Lee",
    );
  });

  it("joins First Middle Last Name when Employee Name is absent", () => {
    assert.equal(
      composeEmployeeName({
        "First Name": "Ann",
        "Middle Name": "Q",
        "Last Name": "Lee",
      }),
      "Ann Q Lee",
    );
  });

  it("returns null when no name fields exist", () => {
    assert.equal(composeEmployeeName({ "Work Email": "a@b.com" }), null);
  });
});

describe("unionFieldsCsv", () => {
  it("keeps first-seen order and dedupes case-insensitively", () => {
    assert.deepEqual(
      unionFieldsCsv("Work Email,First Name", "work email,Date of Joining"),
      ["Work Email", "First Name", "Date of Joining"],
    );
  });
});

describe("combineCreationUploadSections", () => {
  it("merges Personal Details and Current Employment Details into one section", () => {
    const combined = combineCreationUploadSections(
      [
        {
          uploadSectionId: 10,
          sectionId: 1,
          section: "Personal Details",
          fieldsCsv: "Work Email,First Name",
          selectedFields: ["Work Email", "First Name"],
          fieldCount: 2,
          total: 17,
          valid: 17,
          invalid: 0,
          processed: 17,
          unprocessed: 0,
        },
        {
          uploadSectionId: 11,
          sectionId: 14,
          section: "Current Employment Details",
          fieldsCsv: "Work Email,Date of Joining",
          selectedFields: ["Work Email", "Date of Joining"],
          fieldCount: 2,
          total: 17,
          valid: 16,
          invalid: 1,
          processed: 15,
          unprocessed: 2,
        },
      ],
      { sectionId: -2, sectionName: "Personal Details + Current Employment Details" },
    );
    assert.equal(combined.length, 1);
    assert.equal(combined[0]?.sectionId, -2);
    assert.equal(
      combined[0]?.section,
      "Personal Details + Current Employment Details",
    );
    assert.deepEqual(combined[0]?.selectedFields, [
      "Work Email",
      "First Name",
      "Date of Joining",
    ]);
    assert.equal(combined[0]?.fieldCount, 3);
    assert.equal(combined[0]?.total, 17);
    assert.equal(combined[0]?.valid, 16);
    assert.equal(combined[0]?.invalid, 1);
    assert.equal(combined[0]?.processed, 15);
    assert.equal(combined[0]?.unprocessed, 2);
    assert.deepEqual(combined[0]?.sourceUploadSectionIds, [10, 11]);
    assert.deepEqual(combined[0]?.sourceSectionIds, [1, 14]);
  });

  it("leaves sections unchanged when one creation half is missing", () => {
    const sections = [
      {
        uploadSectionId: 10,
        sectionId: 1,
        section: "Personal Details",
        fieldsCsv: "Work Email",
        selectedFields: ["Work Email"],
        fieldCount: 1,
        total: 5,
        valid: 5,
        invalid: 0,
        processed: 5,
        unprocessed: 0,
      },
    ];
    const result = combineCreationUploadSections(sections, {
      sectionId: -2,
      sectionName: "Personal Details + Current Employment Details",
    });
    assert.equal(result.length, 1);
    assert.equal(result[0]?.section, "Personal Details");
    assert.deepEqual(result[0]?.sourceUploadSectionIds, [10]);
    assert.deepEqual(result[0]?.sourceSectionIds, [1]);
  });
});

describe("parseSectionDataRows", () => {
  it("returns selected field values from Section_JSON", () => {
    const parsed = parseSectionDataRows(
      JSON.stringify([
        {
          ID: 12,
          "Work Email": "a@b.com",
          "First Name": "Ann",
          "Last Name": "Lee",
          isValid: true,
        },
      ]),
      ["Work Email", "First Name"],
    );
    assert.equal(parsed.parseError, null);
    assert.equal(parsed.rows[0]?.values["Work Email"], "a@b.com");
    assert.equal(parsed.rows[0]?.values["First Name"], "Ann");
    assert.equal(parsed.rows[0]?.employeeId, 12);
    assert.equal(parsed.rows[0]?.workEmail, "a@b.com");
    assert.equal(parsed.rows[0]?.employeeName, "Ann Lee");
    assert.equal(parsed.rows[0]?.isValid, true);
    assert.deepEqual(parsed.rows[0]?.errors, []);
  });

  it("keeps field names when errorFields.errors is null", () => {
    const parsed = parseSectionDataRows(
      JSON.stringify([
        {
          ID: 12,
          isValid: false,
          errorFields: [{ fieldName: "Account Number", errors: [null] }],
        },
      ]),
      ["ID"],
    );
    assert.deepEqual(parsed.rows[0]?.errors, [
      "Account Number: Failed validation (no errorMessage stored).",
    ]);
  });

  it("explains isValid=false when no error payload exists", () => {
    const parsed = parseSectionDataRows(
      JSON.stringify([{ ID: 12, isValid: false, errorFields: [] }]),
      ["ID"],
    );
    assert.equal(parsed.rows[0]?.isValid, false);
    assert.match(parsed.rows[0]?.errors[0] ?? "", /no errorFields or errorMessage/i);
  });

  it("lists errorFields.errors and a top-level errorMessage array", () => {
    const parsed = parseSectionDataRows(
      JSON.stringify([
        {
          ID: 12,
          isValid: false,
          errorFields: [
            { fieldName: "Account Number", errors: ["This field can't be empty."] },
          ],
          errorMessage: ["Bank Identifier Code is required.", "Branch Name is required."],
        },
      ]),
      ["ID"],
    );
    assert.deepEqual(parsed.rows[0]?.errors, [
      "Account Number: This field can't be empty.",
      "Bank Identifier Code is required.",
      "Branch Name is required.",
    ]);
  });
});

describe("job age flags", () => {
  it("marks Validating/Processing jobs older than 3 hours as stuck", () => {
    const now = Date.parse("2026-09-28T08:00:00.000Z");
    const updated = new Date("2026-09-28T04:00:00.000Z");
    assert.equal(isStuckStatus("Validating", updated, null, now), true);
    assert.equal(isStuckStatus("Validated", updated, null, now), false);
  });

  it("marks Created/Validating/Validated jobs older than 7 days as expired", () => {
    const now = Date.parse("2026-09-28T00:00:00.000Z");
    const old = new Date("2026-09-20T00:00:00.000Z");
    const recent = new Date("2026-09-22T00:00:00.000Z");
    assert.equal(isExpiredUpload("Created", old, now), true);
    assert.equal(isExpiredUpload("Validating", old, now), true);
    assert.equal(isExpiredUpload("Validated", old, now), true);
    assert.equal(isExpiredUpload("Validated", recent, now), false);
    assert.equal(isExpiredUpload("Processing", old, now), false);
    assert.equal(isExpiredUpload("Processed", old, now), false);
  });
});

describe("creationExcludedFieldNames", () => {
  it("excludes Grade and ShiftGroup from the creation template when those settings apply", () => {
    const names = creationExcludedFieldNames({
      isGradeEnable: true,
      isShowShiftRoaster: false,
    });
    assert.ok(names.includes("grade"));
    assert.ok(names.includes("shiftgroup"));
    assert.ok(names.includes("employment number"));
  });
});
