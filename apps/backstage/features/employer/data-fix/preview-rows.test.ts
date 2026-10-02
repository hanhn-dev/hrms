import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { dataFixNextLabel, dataFixPreviewRows } from "./preview-rows.ts";

describe("dataFixPreviewRows", () => {
  it("shows the key, the current value, and the new value", () => {
    const rows = dataFixPreviewRows({
      column: "EmailID",
      keyColumns: ["EmployeeId"],
      sample: [{ EmployeeId: 4, EmailID: "old@tdg.com" }],
      nextValue: "new@tdg.com",
    });
    assert.deepEqual(rows, [
      {
        EmployeeId: "4",
        "Current value": "old@tdg.com",
        "New value": "new@tdg.com",
      },
    ]);
  });

  it("returns no rows when nothing matched", () => {
    assert.deepEqual(
      dataFixPreviewRows({
        column: "EmailID",
        keyColumns: ["EmployeeId"],
        sample: [],
        nextValue: "new@tdg.com",
      }),
      [],
    );
  });

  it("labels a null current value and a null update", () => {
    assert.equal(dataFixNextLabel(true, ""), "NULL");
    const rows = dataFixPreviewRows({
      column: "MiddleName",
      keyColumns: ["EmployeeId", "MiddleName"],
      sample: [{ EmployeeId: 4, MiddleName: null }],
      nextValue: dataFixNextLabel(true, ""),
    });
    assert.equal(rows[0]?.["Current value"], "NULL");
    assert.equal(rows[0]?.["New value"], "NULL");
    assert.equal(rows[0]?.MiddleName, undefined);
  });
});
