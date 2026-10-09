import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { readEditor } from "./editor-preference.ts";

describe("readEditor", () => {
  it("defaults an empty or unknown value to Cursor", () => {
    assert.equal(readEditor(undefined), "cursor");
    assert.equal(readEditor(null), "cursor");
    assert.equal(readEditor(""), "cursor");
    assert.equal(readEditor("notepad"), "cursor");
  });

  it("keeps a saved VS Code choice", () => {
    assert.equal(readEditor("vscode"), "vscode");
    assert.equal(readEditor(" vscode "), "vscode");
  });
});
