import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  APPLY_TABLES,
  assertSqlIdent,
  buildApplyPlan,
  changeRequestStatus,
  isApplyTable,
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
