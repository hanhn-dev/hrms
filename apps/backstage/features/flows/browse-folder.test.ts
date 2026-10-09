import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { parseSelectedFolder } from "./browse-folder.ts";

describe("parseSelectedFolder", () => {
  it("returns nothing when the dialog was cancelled", () => {
    assert.equal(parseSelectedFolder(""), null);
    assert.equal(parseSelectedFolder("   "), null);
  });

  it("returns the selected folder path", () => {
    assert.equal(parseSelectedFolder("D:\\TDG HRMS DB\r\n"), "D:\\TDG HRMS DB");
  });

  it("rejects output that is not a single path", () => {
    assert.equal(parseSelectedFolder("D:\\one\nD:\\two"), null);
  });
});
