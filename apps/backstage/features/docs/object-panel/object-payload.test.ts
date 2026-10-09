import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { columnsFromDefinitionLines } from "./object-payload.ts";

describe("columnsFromDefinitionLines", () => {
  it("reads type, nullability, identity, and primary key", () => {
    assert.deepEqual(
      columnsFromDefinitionLines([
        "EmployeeId int IDENTITY NOT NULL PK",
        "Name nvarchar(100) NULL",
        "Amount decimal(18,2) NOT NULL",
      ]),
      [
        { name: "EmployeeId", dataType: "int", nullable: false, primaryKey: true },
        { name: "Name", dataType: "nvarchar(100)", nullable: true, primaryKey: false },
        { name: "Amount", dataType: "decimal(18,2)", nullable: false, primaryKey: false },
      ],
    );
  });

  it("returns nothing for an empty list", () => {
    assert.deepEqual(columnsFromDefinitionLines([]), []);
  });
});
