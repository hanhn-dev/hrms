import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { columnCopyText } from "./column-values.ts";

describe("columnCopyText", () => {
  it("joins field ids with commas and no spaces", () => {
    assert.equal(
      columnCopyText(
        [{ fieldId: 1874 }, { fieldId: 1862 }, { fieldId: 1863 }],
        "fieldId",
      ),
      "1874,1862,1863",
    );
  });

  it("skips null, undefined, and empty strings", () => {
    assert.equal(
      columnCopyText(
        [
          { fieldId: 1874 },
          { fieldId: null },
          { fieldId: undefined },
          {},
          { fieldId: "" },
          { fieldId: 1862 },
        ],
        "fieldId",
      ),
      "1874,1862",
    );
    assert.equal(columnCopyText([], "fieldId"), "");
  });

  it("keeps zero and false", () => {
    assert.equal(
      columnCopyText([{ active: 0 }, { active: false }, { active: 1 }], "active"),
      "0,false,1",
    );
  });

  it("reads a nested dataIndex", () => {
    assert.equal(
      columnCopyText(
        [{ employer: { fieldType: "Text" } }, { employer: { fieldType: "Date" } }],
        ["employer", "fieldType"],
      ),
      "Text,Date",
    );
    assert.equal(columnCopyText([{ employer: null }], ["employer", "fieldType"]), "");
  });

  it("quotes a value that contains a comma or a quote", () => {
    assert.equal(
      columnCopyText(
        [{ name: "Visa, Passport" }, { name: 'Say "hi"' }, { name: "Plain" }],
        "name",
      ),
      `"Visa, Passport","Say ""hi""",Plain`,
    );
  });
});
