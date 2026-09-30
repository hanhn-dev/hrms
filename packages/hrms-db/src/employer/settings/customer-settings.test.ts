import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { columnPresenceKey } from "../../shared/sql-names.ts";
import {
  CUSTOMER_SETTING_FIELDS,
  CUSTOMER_SETTING_TABLES,
  splitCustomerSettingColumns,
} from "./catalog.ts";

function allPresent(): { tables: Set<string>; columns: Set<string> } {
  return {
    tables: new Set(CUSTOMER_SETTING_TABLES),
    columns: new Set(
      CUSTOMER_SETTING_FIELDS.map((field) =>
        columnPresenceKey(field.table, field.column),
      ),
    ),
  };
}

describe("splitCustomerSettingColumns", () => {
  it("omits OTRequestMode when that column is absent", () => {
    const { tables, columns } = allPresent();
    columns.delete(columnPresenceKey("TCustomerSettings", "OTRequestMode"));
    const split = splitCustomerSettingColumns(tables, columns);
    assert.equal(
      split.presentFields.some((field) => field.key === "OTRequestMode"),
      false,
    );
    assert.deepEqual(
      split.missingColumns.find((column) => column.key === "OTRequestMode"),
      {
        key: "OTRequestMode",
        label: "OT Request Mode",
        table: "TCustomerSettings",
        column: "OTRequestMode",
      },
    );
    assert.equal(split.includeTneJoin, true);
    assert.equal(split.includePayrollJoin, true);
  });

  it("includes OTRequestMode when the column is present", () => {
    const { tables, columns } = allPresent();
    const split = splitCustomerSettingColumns(tables, columns);
    assert.equal(
      split.presentFields.some((field) => field.key === "OTRequestMode"),
      true,
    );
    assert.equal(
      split.missingColumns.some((column) => column.key === "OTRequestMode"),
      false,
    );
  });

  it("drops a missing satellite table join and marks its fields missing", () => {
    const { tables, columns } = allPresent();
    tables.delete("TTNEEmployerConfiguration");
    const split = splitCustomerSettingColumns(tables, columns);
    assert.equal(split.includeTneJoin, false);
    assert.equal(split.includePayrollJoin, true);
    const tneFields = CUSTOMER_SETTING_FIELDS.filter(
      (field) => field.table === "TTNEEmployerConfiguration",
    );
    assert.ok(tneFields.length > 0);
    for (const field of tneFields) {
      assert.equal(
        split.presentFields.some((present) => present.key === field.key),
        false,
        field.key,
      );
      assert.equal(
        split.missingColumns.some((column) => column.key === field.key),
        true,
        field.key,
      );
    }
    assert.equal(
      split.presentFields.some((field) => field.key === "OTRequestMode"),
      true,
    );
  });

  it("matches table and column names case-insensitively", () => {
    const { columns } = allPresent();
    const tables = new Set([
      "tcustomersettings",
      "ttneemployerconfiguration",
      "texternal_payroll_configuration",
    ]);
    const split = splitCustomerSettingColumns(tables, columns);
    assert.equal(split.missingColumns.length, 0);
    assert.equal(split.includeTneJoin, true);
    assert.equal(split.includePayrollJoin, true);
  });
});
