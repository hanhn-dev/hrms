import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  APPLY_TABLES,
  assertSqlIdent,
  buildApplyPlan,
  canonicalApplyTable,
  changeRequestStatus,
  coerceBitApplyValue,
  forceShowOneOnInsert,
  HISTORY_TABLE_BY_SOURCE,
  isApplyTable,
  omitIsDeleteOnInsert,
  pendingApproverFlag,
  resolveApplyValue,
} from "./change-request-apply.ts";

describe("changeRequestStatus", () => {
  it("maps null / bit / 1-0 to pending approved rejected", () => {
    assert.equal(changeRequestStatus(null), "pending");
    assert.equal(changeRequestStatus(undefined), "pending");
    assert.equal(changeRequestStatus(true), "approved");
    assert.equal(changeRequestStatus(1), "approved");
    assert.equal(changeRequestStatus("1"), "approved");
    assert.equal(changeRequestStatus(false), "rejected");
    assert.equal(changeRequestStatus(0), "rejected");
  });
});

describe("assertSqlIdent", () => {
  it("accepts plain identifiers and rejects injection", () => {
    assert.equal(assertSqlIdent("TEmployee"), "TEmployee");
    assert.throws(() => assertSqlIdent("TEmployee; DROP TABLE TUsers"), /identifier/);
  });
});

describe("isApplyTable", () => {
  it("allowlists only the known My Details tables", () => {
    assert.equal(isApplyTable("TEmployee"), true);
    assert.equal(isApplyTable("TEmployeeFamilyDetails"), true);
    assert.equal(isApplyTable("TUsers"), false);
    assert.equal(APPLY_TABLES.includes("TEmployee"), true);
  });

  it("accepts Core's TemployeedetailCustomFields spelling", () => {
    assert.equal(isApplyTable("TemployeedetailCustomFields"), true);
    assert.equal(canonicalApplyTable("TemployeedetailCustomFields"), "TEmployeeDetailCustomFields");
    assert.equal(canonicalApplyTable("TUsers"), null);
  });
});

describe("HISTORY_TABLE_BY_SOURCE", () => {
  it("maps every apply table that has a history table (positive)", () => {
    assert.equal(HISTORY_TABLE_BY_SOURCE.TEmployee, "TEmployeeHistory");
    assert.equal(HISTORY_TABLE_BY_SOURCE.TEmployeeContactDetails, "TEmployeeContactDetailshistory");
    assert.equal(
      HISTORY_TABLE_BY_SOURCE.TEmployeeEmergencyContactDetails,
      "TEmployeeEmergencyContactDetailsHistory",
    );
    assert.equal(HISTORY_TABLE_BY_SOURCE.TEmployeePassportDetails, "TEmployeePassportDetailsHistory");
    assert.equal(HISTORY_TABLE_BY_SOURCE.TEmployeeVisaInfo, "TEmployeeVisaInfoHistory");
    assert.equal(HISTORY_TABLE_BY_SOURCE.TEmployeeNomination, "TEmployeeNominationHistory");
    assert.equal(HISTORY_TABLE_BY_SOURCE.TCertificationDetails, "TCertificationDetailsHistory");
    assert.equal(HISTORY_TABLE_BY_SOURCE.TEducationDetails, "TEducationHistoryDetails");
    assert.equal(HISTORY_TABLE_BY_SOURCE.TPastEmploymentDetails, "TPastEmploymentDetails_History");
    assert.equal(
      HISTORY_TABLE_BY_SOURCE.TEmployeeBudgetSourceDetails,
      "TEmployeeBudgetSourceDetailsHistory",
    );
    assert.equal(HISTORY_TABLE_BY_SOURCE.TEmployeeNominee_Details, "TEmployeeNominee_Details_History");
    assert.equal(HISTORY_TABLE_BY_SOURCE.TEmployeeFamilyDetails, "TEmployeeFamilyDetails_history");
    assert.equal(HISTORY_TABLE_BY_SOURCE.TEmployeeBankDetails, "TEmployeeBankDetails_History");
    assert.equal(
      HISTORY_TABLE_BY_SOURCE.TEmployeeDetailCustomFields,
      "TEmployeedetailCustomFieldshistory",
    );
  });

  it("does not snapshot attachment rows (negative)", () => {
    assert.equal(isApplyTable("TEmployeeAttachment"), true);
    assert.equal(HISTORY_TABLE_BY_SOURCE.TEmployeeAttachment, undefined);
  });

  it("rejects an unknown table and leaves it out of the map (edge)", () => {
    assert.equal(isApplyTable("TNotAProfileTable"), false);
    assert.equal(isApplyTable(""), false);
    assert.equal(isApplyTable("  "), false);
    assert.equal(canonicalApplyTable("TNotAProfileTable"), null);
    assert.equal(
      Object.prototype.hasOwnProperty.call(HISTORY_TABLE_BY_SOURCE, "TNotAProfileTable"),
      false,
    );
  });
});

describe("bank insert visibility defaults", () => {
  it("omits IsDelete and forces Show=1 only for TEmployeeBankDetails", () => {
    assert.equal(omitIsDeleteOnInsert("TEmployeeBankDetails"), true);
    assert.equal(omitIsDeleteOnInsert("TEmployeeFamilyDetails"), false);
    assert.equal(forceShowOneOnInsert("TEmployeeBankDetails"), true);
    assert.equal(forceShowOneOnInsert("TEducationDetails"), false);
  });
});

describe("coerceBitApplyValue", () => {
  it("prefers 0/1 TextValueNew and coerces Y/N NewValue when Text is null", () => {
    assert.equal(coerceBitApplyValue("1", "Y"), "1");
    assert.equal(coerceBitApplyValue("0", "N"), "0");
    assert.equal(coerceBitApplyValue(null, "N"), "0");
    assert.equal(coerceBitApplyValue(null, "Y"), "1");
    assert.equal(coerceBitApplyValue("N", "1"), "1");
    assert.equal(coerceBitApplyValue("yes", null), "1");
    assert.equal(coerceBitApplyValue("no", null), "0");
    assert.throws(() => coerceBitApplyValue(null, null), /Cannot coerce bit/);
    assert.throws(() => coerceBitApplyValue("maybe", null), /Cannot coerce bit/);
  });
});

describe("resolveApplyValue", () => {
  it("prefers TextValueNew and refuses encrypt expressions without NewValue", () => {
    assert.equal(
      resolveApplyValue({
        tableName: "TEmployee",
        dbFieldName: "FName",
        textValueNew: "Jane",
        newValue: "ignored",
      }).value,
      "Jane",
    );
    assert.equal(
      resolveApplyValue({
        tableName: "TEmployee",
        dbFieldName: "TaxId",
        textValueNew: "Fn_EncryptData('secret')",
        newValue: "secret",
      }).value,
      "secret",
    );
    assert.throws(
      () =>
        resolveApplyValue({
          tableName: "TEmployee",
          dbFieldName: "TaxId",
          textValueNew: "Fn_EncryptData('secret')",
          newValue: null,
        }),
      /encrypted/,
    );
  });

  it("coerces Y/N to 0/1 for bit columns (bank isDefault null → NewValue N)", () => {
    assert.equal(
      resolveApplyValue({
        tableName: "TEmployeeBankDetails",
        dbFieldName: "isDefault",
        textValueNew: null,
        newValue: "N",
        dataType: "bit",
      }).value,
      "0",
    );
    assert.equal(
      resolveApplyValue({
        tableName: "TEmployeeBankDetails",
        dbFieldName: "Payroll",
        textValueNew: "1",
        newValue: "Y",
        dataType: "bit",
      }).value,
      "1",
    );
  });
});

describe("pendingApproverFlag", () => {
  it("is true only when the employee is in the pending manager set", () => {
    assert.equal(pendingApproverFlag(10, [10, 11]), true);
    assert.equal(pendingApproverFlag(12, [10, 11]), false);
  });
});

describe("buildApplyPlan", () => {
  const columns = new Map<string, Set<string>>([
    ["TEmployee", new Set(["FName", "CellNumber"])],
    ["TEmployeeFamilyDetails", new Set(["Name", "Relation"])],
    ["TEmployeeBankDetails", new Set(["isDefault", "Payroll", "AccountNo"])],
  ]);
  const types = new Map([
    [
      "TEmployeeBankDetails",
      new Map([
        ["isDefault", "bit"],
        ["Payroll", "bit"],
        ["AccountNo", "nvarchar"],
      ]),
    ],
  ]);

  it("builds update and insert writes from allowlisted columns", () => {
    const writes = buildApplyPlan(
      [
        {
          tableName: "TEmployee",
          dbFieldName: "FName",
          textValueNew: "Jane",
          newValue: null,
          isNew: 0,
          childRowId: 1431,
        },
        {
          tableName: "TEmployeeFamilyDetails",
          dbFieldName: "Name",
          textValueNew: "Kid",
          newValue: null,
          isNew: 1,
          childRowId: null,
        },
      ],
      columns,
    );
    assert.equal(writes.length, 2);
    assert.deepEqual(writes[0], {
      table: "TEmployee",
      column: "FName",
      kind: "update",
      childRowId: 1431,
      value: "Jane",
    });
    assert.equal(writes[1]?.kind, "insert");
    assert.equal(writes[1]?.table, "TEmployeeFamilyDetails");
  });

  it("coerces bank bit fields when TextValueNew is null and NewValue is Y/N", () => {
    const writes = buildApplyPlan(
      [
        {
          tableName: "TEmployeeBankDetails",
          dbFieldName: "isDefault",
          textValueNew: null,
          newValue: "N",
          isNew: 1,
          childRowId: null,
        },
        {
          tableName: "TEmployeeBankDetails",
          dbFieldName: "Payroll",
          textValueNew: "1",
          newValue: "Y",
          isNew: 1,
          childRowId: null,
        },
        {
          tableName: "TEmployeeBankDetails",
          dbFieldName: "AccountNo",
          textValueNew: "11242125251",
          newValue: "11242125251",
          isNew: 1,
          childRowId: null,
        },
      ],
      columns,
      types,
    );
    assert.equal(writes.find((w) => w.column === "isDefault")?.value, "0");
    assert.equal(writes.find((w) => w.column === "Payroll")?.value, "1");
    assert.equal(writes.find((w) => w.column === "AccountNo")?.value, "11242125251");
  });

  it("canonicalizes TemployeedetailCustomFields and keeps ChildRowId as the field id", () => {
    const writes = buildApplyPlan(
      [
        {
          tableName: "TemployeedetailCustomFields",
          dbFieldName: "CustomValue",
          textValueNew: "775",
          newValue: "775",
          isNew: 1,
          childRowId: 42,
          changeDetailsId: 9,
          custDetailId: "10302",
        },
      ],
      new Map([["TemployeedetailCustomFields", new Set(["CustomValue"])]]),
    );
    assert.equal(writes.length, 1);
    assert.equal(writes[0]?.table, "TEmployeeDetailCustomFields");
    assert.equal(writes[0]?.column, "CustomValue");
    assert.equal(writes[0]?.kind, "insert");
    assert.equal(writes[0]?.childRowId, 42);
    assert.equal(writes[0]?.value, "775");
    assert.equal(writes[0]?.changeDetailsId, 9);
  });

  it("rejects unknown tables, unknown columns, and edits without ChildRowId", () => {
    assert.throws(
      () =>
        buildApplyPlan(
          [
            {
              tableName: "TUsers",
              dbFieldName: "UserName",
              textValueNew: "x",
              newValue: null,
              isNew: 0,
              childRowId: 1,
            },
          ],
          columns,
        ),
      /not allowed/,
    );
    assert.throws(
      () =>
        buildApplyPlan(
          [
            {
              tableName: "TEmployee",
              dbFieldName: "NotAColumn",
              textValueNew: "x",
              newValue: null,
              isNew: 0,
              childRowId: 1,
            },
          ],
          columns,
        ),
      /was not found/,
    );
    assert.throws(
      () =>
        buildApplyPlan(
          [
            {
              tableName: "TEmployee",
              dbFieldName: "FName",
              textValueNew: "Jane",
              newValue: null,
              isNew: 0,
              childRowId: null,
            },
          ],
          columns,
        ),
      /ChildRowId/,
    );
  });
});
