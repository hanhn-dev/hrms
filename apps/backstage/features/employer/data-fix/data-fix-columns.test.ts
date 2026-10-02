import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { dataFixColumnWidth, dataFixTableScrollX } from "./data-fix-columns.ts";

const changeRequestColumns = [
  { name: "ChangeDetailsId", typeName: "int" },
  { name: "ChangeRequestId", typeName: "int" },
  { name: "TableName", typeName: "varchar" },
  { name: "FieldName", typeName: "varchar" },
  { name: "NewValue", typeName: "varchar" },
  { name: "OldValue", typeName: "varchar" },
  { name: "TextValueNew", typeName: "varchar" },
  { name: "TextValueOld", typeName: "varchar" },
  { name: "SectionName", typeName: "varchar" },
  { name: "IsNew", typeName: "bit" },
  { name: "IsChildTableField", typeName: "bit" },
  { name: "ChildRowId", typeName: "int" },
  { name: "DBFieldName", typeName: "varchar" },
];

describe("dataFixColumnWidth", () => {
  it("gives every column a positive width", () => {
    for (const column of changeRequestColumns) {
      assert.ok(dataFixColumnWidth(column.name, column.typeName) > 0);
    }
    assert.equal(dataFixColumnWidth("", "int"), 96);
  });

  it("keeps text columns wider than short int and bit columns", () => {
    const text = dataFixColumnWidth("NewValue", "varchar");
    assert.ok(text >= 180);
    assert.ok(text > dataFixColumnWidth("IsNew", "bit"));
    assert.ok(text > dataFixColumnWidth("ChildRowId", "int"));
    assert.ok(dataFixColumnWidth("Notes", "nvarchar") >= 180);
    assert.ok(dataFixColumnWidth("Body", "text") >= 180);
  });
});

describe("dataFixTableScrollX", () => {
  it("equals the sum of the column widths", () => {
    const expected = changeRequestColumns.reduce(
      (sum, column) => sum + dataFixColumnWidth(column.name, column.typeName),
      0,
    );
    assert.equal(dataFixTableScrollX(changeRequestColumns), expected);
    assert.equal(dataFixTableScrollX([]), 0);
  });
});
