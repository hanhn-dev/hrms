import assert from "node:assert/strict";
import { createElement, useState } from "react";
import { describe, it } from "vitest";
import {
  buildRowSearchTexts,
  columnCellText,
  matchesColumnFilter,
  rowMatchesTableSearch,
  shouldApplyDefaultFilter,
} from "./data-table-filter.ts";

function YesNoTag({ value }: { value: boolean }) {
  return createElement("span", null, value ? "Yes" : "No");
}

describe("matchesColumnFilter", () => {
  it("matches every cell when the query is blank", () => {
    assert.equal(matchesColumnFilter("Yes", ""), true);
    assert.equal(matchesColumnFilter("Yes", "   "), true);
    assert.equal(matchesColumnFilter("", null), true);
  });

  it("matches a case-insensitive substring", () => {
    assert.equal(matchesColumnFilter("Yes", "yes"), true);
    assert.equal(matchesColumnFilter("TEmployeeInfo.PreviousExperience", "previous"), true);
    assert.equal(matchesColumnFilter("62064", "206"), true);
    assert.equal(matchesColumnFilter("No", "yes"), false);
  });
});

describe("columnCellText", () => {
  it("uses a string render result", () => {
    const text = columnCellText(
      {
        title: "Country",
        render: () => "All",
      },
      {},
    );
    assert.equal(text, "All");
  });

  it("reads the label from a simple tag", () => {
    const text = columnCellText(
      {
        dataIndex: "isHidden",
        render: (value: unknown) => createElement(YesNoTag, { value: value === true }),
      },
      { isHidden: true },
    );
    assert.equal(text, "Yes");
  });

  it("falls back to the raw value when the cell uses hooks", () => {
    let calls = 0;
    function HookCell({ value }: { value: string }) {
      // The counter proves the cell is not rendered.
      // eslint-disable-next-line react-hooks/globals
      calls += 1;
      useState(0);
      return createElement("span", null, value);
    }
    const text = columnCellText(
      {
        dataIndex: "validationRule",
        render: (value: unknown) => createElement(HookCell, { value: String(value) }),
      },
      { validationRule: '{"rule":"Year"}' },
    );
    assert.equal(calls, 0);
    assert.equal(text, '{"rule":"Year"}');
  });

  it("reads a nested data index when there is no render", () => {
    const text = columnCellText({ dataIndex: ["employer", "name"] }, { employer: { name: "TDG" } });
    assert.equal(text, "TDG");
  });
});

describe("rowMatchesTableSearch", () => {
  const columns = [
    {
      title: "Name",
      children: [{ title: "Field", dataIndex: "fieldName" }],
    },
    { title: "Type", dataIndex: "fieldType" },
    {
      key: "editable-actions",
      title: "",
      render: () => "Edit",
    },
  ];
  const row = { fieldName: "Date of Joining", fieldType: "Date Picker" };

  it("matches every row when the query is blank", () => {
    assert.equal(rowMatchesTableSearch(columns, row, ""), true);
    assert.equal(rowMatchesTableSearch(columns, row, "   "), true);
    assert.equal(rowMatchesTableSearch(undefined, row, ""), true);
  });

  it("matches a nested column and ignores the edit-actions column", () => {
    assert.equal(rowMatchesTableSearch(columns, row, "joining"), true);
    assert.equal(rowMatchesTableSearch(columns, row, "DATE"), true);
    assert.equal(rowMatchesTableSearch(columns, row, "salary"), false);
    assert.equal(rowMatchesTableSearch(columns, row, "Edit"), false);
    assert.equal(rowMatchesTableSearch(undefined, row, "joining"), false);
    assert.equal(rowMatchesTableSearch([], row, "joining"), false);
  });

  it("skips columns with tableSearch false", () => {
    const withOptOut = [
      { title: "Name", dataIndex: "fullName" },
      { title: "Skills", dataIndex: "skillCount", tableSearch: false as const },
    ];
    const employee = { fullName: "Ada Lovelace", skillCount: 42 };
    assert.equal(rowMatchesTableSearch(withOptOut, employee, "Ada"), true);
    assert.equal(rowMatchesTableSearch(withOptOut, employee, "42"), false);
  });
});

describe("buildRowSearchTexts", () => {
  it("builds lowercase haystacks and skips opted-out columns", () => {
    const columns = [
      { title: "Name", dataIndex: "fullName" },
      { title: "Skills", dataIndex: "skillCount", tableSearch: false as const },
      {
        key: "editable-actions",
        title: "",
        render: () => "Edit",
      },
    ];
    const rows = [
      { fullName: "Ada Lovelace", skillCount: 42 },
      { fullName: "Grace Hopper", skillCount: 7 },
    ];
    const texts = buildRowSearchTexts(columns, rows);
    assert.equal(texts.length, 2);
    assert.equal(texts[0]?.includes("ada lovelace"), true);
    assert.equal(texts[0]?.includes("42"), false);
    assert.equal(texts[0]?.includes("edit"), false);
    assert.equal(texts[1]?.includes("grace hopper"), true);
  });

  it("returns empty strings when there are no columns", () => {
    assert.deepEqual(buildRowSearchTexts(undefined, [{ name: "a" }]), [""]);
    assert.deepEqual(buildRowSearchTexts([], [{ name: "a" }]), [""]);
  });
});

describe("shouldApplyDefaultFilter", () => {
  it("leaves a column that already filters itself", () => {
    assert.equal(
      shouldApplyDefaultFilter({
        dataIndex: "status",
        onFilter: () => true,
      }),
      false,
    );
    assert.equal(
      shouldApplyDefaultFilter({
        dataIndex: "role",
        filters: [{ text: "Admin", value: "Admin" }],
      }),
      false,
    );
    assert.equal(
      shouldApplyDefaultFilter({
        dataIndex: "name",
        filterDropdown: () => null,
      }),
      false,
    );
  });

  it("skips a column with no value and the edit-actions column", () => {
    assert.equal(shouldApplyDefaultFilter({ title: "" }), false);
    assert.equal(shouldApplyDefaultFilter({ title: "Notes" }), false);
    assert.equal(
      shouldApplyDefaultFilter({
        key: "editable-actions",
        title: "",
        render: () => "Edit",
      }),
      false,
    );
  });

  it("includes value columns and string-rendered columns", () => {
    assert.equal(shouldApplyDefaultFilter({ dataIndex: "fieldId", title: "FieldID" }), true);
    assert.equal(
      shouldApplyDefaultFilter({
        title: "Country",
        render: () => "All",
      }),
      true,
    );
  });
});
