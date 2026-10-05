import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readablePageName } from "./page-name.ts";

describe("readablePageName", () => {
  it("turns an ASP.NET class name into words", () => {
    assert.equal(
      readablePageName("ASP.hrm_leaves_attendanceleave_aspx"),
      "hrm leaves attendanceleave",
    );
  });

  it("leaves a blank page blank", () => {
    assert.equal(readablePageName(null), "");
    assert.equal(readablePageName("  "), "");
  });
});
