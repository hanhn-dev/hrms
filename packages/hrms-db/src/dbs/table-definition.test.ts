import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatTableDefinitionLine,
  type TableColumnDefinition,
} from "./table-definition.ts";

function column(
  overrides: Partial<TableColumnDefinition> & Pick<TableColumnDefinition, "name" | "typeName">,
): TableColumnDefinition {
  return {
    maxLength: 0,
    precision: 0,
    scale: 0,
    nullable: false,
    identity: false,
    primaryKey: false,
    ...overrides,
  };
}

describe("formatTableDefinitionLine", () => {
  it("renders type length, nullability, identity, and primary key", () => {
    assert.equal(
      formatTableDefinitionLine(
        column({
          name: "EmployerId",
          typeName: "int",
          primaryKey: true,
        }),
      ),
      "EmployerId int NOT NULL PK",
    );
    assert.equal(
      formatTableDefinitionLine(
        column({
          name: "Id",
          typeName: "int",
          identity: true,
          primaryKey: true,
        }),
      ),
      "Id int IDENTITY NOT NULL PK",
    );
    assert.equal(
      formatTableDefinitionLine(
        column({
          name: "Name",
          typeName: "nvarchar",
          maxLength: 400,
          nullable: true,
        }),
      ),
      "Name nvarchar(200) NULL",
    );
    assert.equal(
      formatTableDefinitionLine(
        column({
          name: "Notes",
          typeName: "nvarchar",
          maxLength: -1,
          nullable: true,
        }),
      ),
      "Notes nvarchar(max) NULL",
    );
    assert.equal(
      formatTableDefinitionLine(
        column({
          name: "Amount",
          typeName: "decimal",
          precision: 18,
          scale: 2,
          nullable: true,
        }),
      ),
      "Amount decimal(18,2) NULL",
    );
  });
});
