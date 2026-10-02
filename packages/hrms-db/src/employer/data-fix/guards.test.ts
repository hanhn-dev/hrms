import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  browseFilters,
  browseOrderColumns,
  dataFixWriteBlock,
  planColumnFilters,
  isBrowseColumnEditable,
  parseDataFixLiteral,
  planDataFixBatch,
  planDataFixWrite,
  rankColumnHits,
  rankTableHits,
  type DataFixBrowseColumn,
  type DataFixColumnFacts,
  type DataFixColumnHit,
  type DataFixTableHit,
} from "./guards.ts";

const hit = (
  schema: string,
  table: string,
  column: string,
): DataFixColumnHit => ({
  schema,
  table,
  column,
  typeName: "nvarchar",
  nullable: true,
  hasEmployerColumn: true,
});

const writable: DataFixColumnFacts = {
  schema: "dbo",
  table: "TEmployee",
  column: "EmailID",
  typeName: "nvarchar",
  maxLength: 100,
  nullable: true,
  identity: false,
  primaryKey: false,
  computed: false,
  hasEmployerColumn: true,
  employerColumn: "Employerid",
  employeeColumn: "EmployeeId",
  keyColumns: ["EmployeeId"],
};

describe("rankColumnHits", () => {
  const hits = [
    hit("dbo", "TEmployeeInfo", "EmploymentNumber"),
    hit("dbo", "TEmployee", "EmailID"),
    hit("dbo", "TUsers", "EmailID"),
    hit("audit", "TLog", "Detail"),
  ];

  it("puts an exact column name before a partial match", () => {
    const ranked = rankColumnHits("EmailID", hits);
    assert.deepEqual(
      ranked.map((row) => row.table),
      ["TEmployee", "TUsers"],
    );
  });

  it("returns nothing for a blank or one-character search", () => {
    assert.deepEqual(rankColumnHits("", hits), []);
    assert.deepEqual(rankColumnHits(" ", hits), []);
    assert.deepEqual(rankColumnHits("E", hits), []);
  });

  it("keeps the same column on every table that contains it", () => {
    const ranked = rankColumnHits("email", hits);
    assert.equal(ranked.length, 2);
    assert.equal(ranked[0]?.column, "EmailID");
    assert.equal(ranked[1]?.column, "EmailID");
  });
});

describe("rankTableHits", () => {
  const tables: DataFixTableHit[] = [
    { schema: "dbo", table: "TEmployee", hasEmployerColumn: true },
    { schema: "dbo", table: "TEmployeeInfo", hasEmployerColumn: true },
    { schema: "dbo", table: "TUsers", hasEmployerColumn: true },
  ];

  it("puts an exact table name before a partial match", () => {
    assert.deepEqual(
      rankTableHits("TEmployee", tables).map((row) => row.table),
      ["TEmployee", "TEmployeeInfo"],
    );
  });

  it("returns nothing for a blank search", () => {
    assert.deepEqual(rankTableHits("", tables), []);
    assert.deepEqual(rankTableHits("T", tables), []);
  });
});

describe("browseFilters", () => {
  const columns = [
    { name: "EmailID", typeName: "varchar" },
    { name: "EmployeeId", typeName: "int" },
    { name: "IsActive", typeName: "bit" },
  ];

  it("searches text columns for a word", () => {
    assert.deepEqual(browseFilters(columns, "ada"), [{ name: "EmailID", kind: "text" }]);
  });

  it("returns nothing when the find box is empty", () => {
    assert.deepEqual(browseFilters(columns, "  "), []);
  });

  it("does not scan date columns for a plain number", () => {
    const filters = browseFilters(
      [...columns, { name: "CreatedDate", typeName: "datetime" }],
      "1436",
    );
    assert.equal(filters.some((filter) => filter.kind === "date"), false);
  });

  it("also matches whole-number and bit columns for 1", () => {
    const filters = browseFilters(columns, "1");
    assert.equal(filters.some((filter) => filter.name === "EmployeeId" && filter.kind === "number"), true);
    assert.equal(filters.some((filter) => filter.name === "IsActive" && filter.kind === "bit"), true);
  });
});

describe("planColumnFilters", () => {
  const columns = [
    { name: "EmailID", typeName: "varchar" },
    { name: "EmployeeId", typeName: "int" },
    { name: "IsActive", typeName: "bit" },
    { name: "CreatedDate", typeName: "datetime" },
  ];

  it("plans text, number, bit, and date filters", () => {
    assert.deepEqual(
      planColumnFilters(columns, [
        { column: "EmailID", value: "ada" },
        { column: "EmployeeId", value: "12" },
        { column: "IsActive", value: "true" },
        { column: "CreatedDate", value: "2026-01-02" },
      ]),
      {
        ok: true,
        filters: [
          { name: "EmailID", kind: "text", text: "ada" },
          { name: "EmployeeId", kind: "number", value: 12 },
          { name: "IsActive", kind: "bit", value: true },
          { name: "CreatedDate", kind: "date", text: "2026-01-02" },
        ],
      },
    );
  });

  it("rejects a number column when the value is not numeric", () => {
    assert.deepEqual(planColumnFilters(columns, [{ column: "EmployeeId", value: "ada" }]), {
      ok: false,
      message: "EmployeeId needs a number.",
    });
  });

  it("returns no filters when every value is blank", () => {
    assert.deepEqual(
      planColumnFilters(columns, [
        { column: "EmailID", value: "  " },
        { column: "", value: "ada" },
      ]),
      { ok: true, filters: [] },
    );
  });
});

describe("browseOrderColumns", () => {
  it("uses identity columns when the table has one", () => {
    assert.deepEqual(
      browseOrderColumns([
        { name: "EmployerId", identity: false, primaryKey: true },
        { name: "RowId", identity: true, primaryKey: false },
      ]),
      ["RowId"],
    );
  });

  it("uses the primary key when there is no identity", () => {
    assert.deepEqual(
      browseOrderColumns([{ name: "Code", identity: false, primaryKey: true }]),
      ["Code"],
    );
  });

  it("returns nothing when the table has neither", () => {
    assert.deepEqual(
      browseOrderColumns([{ name: "Note", identity: false, primaryKey: false }]),
      [],
    );
  });
});

describe("planDataFixBatch", () => {
  const columns: DataFixBrowseColumn[] = [
    {
      name: "EmployeeId",
      typeName: "int",
      nullable: false,
      identity: true,
      primaryKey: true,
      computed: false,
    },
    {
      name: "Gender",
      typeName: "int",
      nullable: true,
      identity: false,
      primaryKey: false,
      computed: false,
    },
    {
      name: "Employerid",
      typeName: "int",
      nullable: false,
      identity: false,
      primaryKey: false,
      computed: false,
    },
  ];

  it("groups two cells on one row into one update", () => {
    const rows = planDataFixBatch({
      columns,
      keyColumns: ["EmployeeId"],
      hasEmployerColumn: true,
      changes: [
        { keys: { EmployeeId: "1436" }, column: "Gender", previous: "1", next: "2" },
      ],
    });
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.sets[0]?.column, "Gender");
    assert.deepEqual(rows[0]?.sets[0]?.next, { kind: "int", value: 2 });
  });

  it("refuses an identity column and a table with no key", () => {
    assert.equal(
      isBrowseColumnEditable(columns[0]!, true),
      false,
    );
    assert.throws(
      () =>
        planDataFixBatch({
          columns,
          keyColumns: [],
          hasEmployerColumn: true,
          changes: [
            { keys: {}, column: "Gender", previous: "1", next: "2" },
          ],
        }),
      /primary key/,
    );
  });

  it("rejects an empty batch", () => {
    assert.throws(
      () =>
        planDataFixBatch({
          columns,
          keyColumns: ["EmployeeId"],
          hasEmployerColumn: true,
          changes: [],
        }),
      /at least one cell/,
    );
  });
});

describe("dataFixWriteBlock", () => {
  it("allows a normal employer-scoped value column", () => {
    assert.equal(dataFixWriteBlock(writable), null);
  });

  it("refuses identity, primary key, and Employerid", () => {
    assert.match(
      dataFixWriteBlock({ ...writable, identity: true }) ?? "",
      /Identity/,
    );
    assert.match(
      dataFixWriteBlock({ ...writable, primaryKey: true }) ?? "",
      /Primary key/,
    );
    assert.match(
      dataFixWriteBlock({ ...writable, column: "Employerid" }) ?? "",
      /Employerid/,
    );
  });

  it("refuses a table with no employer column and a computed column", () => {
    assert.match(
      dataFixWriteBlock({
        ...writable,
        hasEmployerColumn: false,
        employerColumn: null,
      }) ?? "",
      /no Employerid/,
    );
    assert.match(
      dataFixWriteBlock({ ...writable, computed: true }) ?? "",
      /Computed/,
    );
    assert.match(
      dataFixWriteBlock({ ...writable, typeName: "float" }) ?? "",
      /float/,
    );
  });
});

describe("parseDataFixLiteral", () => {
  it("parses text, whole numbers, bits, and dates", () => {
    assert.deepEqual(parseDataFixLiteral("nvarchar", "  Ada "), {
      kind: "string",
      value: "Ada",
    });
    assert.deepEqual(parseDataFixLiteral("int", "12"), { kind: "int", value: 12 });
    assert.deepEqual(parseDataFixLiteral("bit", "yes"), { kind: "bit", value: true });
    assert.deepEqual(parseDataFixLiteral("date", "2020-01-31"), {
      kind: "datetime",
      value: "2020-01-31",
    });
  });

  it("rejects an empty value", () => {
    assert.throws(() => parseDataFixLiteral("nvarchar", "   "), /Enter a value/);
  });

  it("rejects a fractional int and an impossible date", () => {
    assert.throws(() => parseDataFixLiteral("int", "1.5"), /whole number/);
    assert.throws(() => parseDataFixLiteral("date", "2020-02-31"), /real date/);
  });
});

describe("planDataFixWrite", () => {
  it("plans an employer-scoped match and a new value", () => {
    const plan = planDataFixWrite({
      facts: writable,
      employerId: 10,
      employeeId: 4,
      matchNull: false,
      matchText: "old@tdg.com",
      setNull: false,
      newText: "new@tdg.com",
    });
    assert.equal(plan.employerId, 10);
    assert.equal(plan.employerColumn, "Employerid");
    assert.equal(plan.employeeId, 4);
    assert.equal(plan.employeeColumn, "EmployeeId");
    assert.deepEqual(plan.match, { kind: "string", value: "old@tdg.com" });
    assert.deepEqual(plan.next, { kind: "string", value: "new@tdg.com" });
  });

  it("rejects a blank current value and NULL on a required column", () => {
    assert.throws(
      () =>
        planDataFixWrite({
          facts: writable,
          employerId: 10,
          employeeId: null,
          matchNull: false,
          matchText: "  ",
          setNull: false,
          newText: "next",
        }),
      /Current value is required/,
    );
    assert.throws(
      () =>
        planDataFixWrite({
          facts: { ...writable, nullable: false },
          employerId: 10,
          employeeId: null,
          matchNull: false,
          matchText: "old",
          setNull: true,
          newText: null,
        }),
      /does not allow NULL/,
    );
  });

  it("refuses an employee filter when the table has no EmployeeId", () => {
    assert.throws(
      () =>
        planDataFixWrite({
          facts: { ...writable, employeeColumn: null },
          employerId: 10,
          employeeId: 4,
          matchNull: true,
          matchText: null,
          setNull: false,
          newText: "next",
        }),
      /no EmployeeId/,
    );
  });
});
