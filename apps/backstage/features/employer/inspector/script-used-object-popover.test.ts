import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  columnRowClass,
  filterTableColumnRows,
  usedObjectPopoverContent,
  type TableColumnRow,
} from "./script-used-object-popover.ts";

const rows: TableColumnRow[] = [
  {
    name: "EmployeeId",
    type: "int",
    length: "",
    nullable: "No",
    identity: "Yes",
    primaryKey: true,
    foreignKey: false,
  },
  {
    name: "EmployerId",
    type: "int",
    length: "",
    nullable: "No",
    identity: "No",
    primaryKey: false,
    foreignKey: true,
  },
  {
    name: "Name",
    type: "nvarchar(200)",
    length: "200",
    nullable: "Yes",
    identity: "No",
    primaryKey: false,
    foreignKey: false,
  },
];

describe("usedObjectPopoverContent", () => {
  it("lists type, length, nullability, identity, and key flags for each column", () => {
    assert.deepEqual(
      usedObjectPopoverContent("table", [
        {
          name: "EmployeeId",
          type: "int",
          length: "",
          nullable: false,
          identity: true,
          primaryKey: true,
          foreignKey: false,
        },
        {
          name: "Name",
          type: "nvarchar(200)",
          length: "200",
          nullable: true,
          identity: false,
          primaryKey: false,
          foreignKey: false,
        },
      ]),
      {
        kind: "columns",
        rows: [rows[0], rows[2]],
      },
    );
  });

  it("returns an empty column list when the table has no columns", () => {
    assert.deepEqual(usedObjectPopoverContent("table", []), {
      kind: "columns",
      rows: [],
    });
    assert.deepEqual(usedObjectPopoverContent("table", null), {
      kind: "columns",
      rows: [],
    });
  });

  it("keeps view, procedure, and function actions", () => {
    for (const kind of ["view", "storedProcedure", "function"] as const) {
      assert.deepEqual(usedObjectPopoverContent(kind, null), {
        kind: "actions",
        actions: ["View script", "Execute"],
      });
    }
  });
});

describe("filterTableColumnRows", () => {
  it("matches a column name, type, or length", () => {
    assert.deepEqual(
      filterTableColumnRows(rows, "name").map((row) => row.name),
      ["Name"],
    );
    assert.deepEqual(
      filterTableColumnRows(rows, "nvarchar").map((row) => row.name),
      ["Name"],
    );
    assert.deepEqual(
      filterTableColumnRows(rows, "200").map((row) => row.name),
      ["Name"],
    );
  });

  it("returns every column when the search is empty", () => {
    assert.equal(filterTableColumnRows(rows, "  ").length, rows.length);
    assert.deepEqual(filterTableColumnRows([], "id"), []);
  });
});

describe("columnRowClass", () => {
  it("highlights primary-key and foreign-key rows", () => {
    assert.match(columnRowClass(rows[0]!), /amber/);
    assert.doesNotMatch(columnRowClass(rows[0]!), /sky-50/);
    assert.match(columnRowClass(rows[1]!), /sky/);
    assert.equal(columnRowClass(rows[2]!), "");
    assert.match(columnRowClass({ primaryKey: true, foreignKey: true }), /amber/);
    assert.match(columnRowClass({ primaryKey: true, foreignKey: true }), /sky-500/);
  });
});
