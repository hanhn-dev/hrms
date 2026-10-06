import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  COMPARE_FIELD_TABLE_TITLES,
  EMPLOYER_FIELD_TABLE_TITLES,
  fieldColumnTitle,
} from "./field-table-columns.ts";

describe("section field tables", () => {
  it("shows FieldType_JSON_SQL after ValidationRule on employer and template tables", () => {
    const titles = [...EMPLOYER_FIELD_TABLE_TITLES];
    const rule = titles.indexOf("ValidationRule");
    assert.equal(titles[rule + 1], "FieldType_JSON_SQL");
  });

  it("shows FieldType_JSON_SQL on the compare tables", () => {
    assert.equal(
      fieldColumnTitle(COMPARE_FIELD_TABLE_TITLES, "FieldType_JSON_SQL"),
      "FieldType_JSON_SQL",
    );
    const titles = [...COMPARE_FIELD_TABLE_TITLES];
    const rule = titles.indexOf("ValidationRule");
    assert.equal(titles[rule + 1], "FieldType_JSON_SQL");
  });
});
