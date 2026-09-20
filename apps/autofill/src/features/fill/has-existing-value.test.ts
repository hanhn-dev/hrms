import { hasExistingValue } from "./has-existing-value";
import type { ScannedField } from "@/shared/messaging";

function field(
  partial: Partial<ScannedField> & Pick<ScannedField, "kind">,
): ScannedField {
  return {
    id: "f1",
    label: "Field",
    tagName: "INPUT",
    inputType: "text",
    disabled: false,
    readOnly: false,
    maxLength: null,
    selectorHint: "#f1",
    valuePreview: "",
    ...partial,
  };
}

describe("hasExistingValue", () => {
  it("returns false for an empty text input (positive)", () => {
    const input = document.createElement("input");
    input.value = "";
    expect(hasExistingValue(input, field({ kind: "text" }))).toBe(false);
  });

  it("returns true for a non-empty text input (negative)", () => {
    const input = document.createElement("input");
    input.value = "Acme";
    expect(hasExistingValue(input, field({ kind: "text" }))).toBe(true);
  });

  it("treats whitespace-only as empty (edge)", () => {
    const input = document.createElement("input");
    input.value = "  \t  ";
    expect(hasExistingValue(input, field({ kind: "text" }))).toBe(false);
  });

  it("returns true when a radio in the group is checked (positive)", () => {
    document.body.innerHTML = `
      <label><input id="a" type="radio" name="status" value="a" checked />A</label>
      <label><input id="b" type="radio" name="status" value="b" />B</label>
    `;
    const el = document.getElementById("b") as HTMLInputElement;
    expect(hasExistingValue(el, field({ kind: "radio" }))).toBe(true);
  });

  it("returns false when no radio in the group is checked (edge)", () => {
    document.body.innerHTML = `
      <label><input id="a" type="radio" name="status" value="a" />A</label>
      <label><input id="b" type="radio" name="status" value="b" />B</label>
    `;
    const el = document.getElementById("a") as HTMLInputElement;
    expect(hasExistingValue(el, field({ kind: "radio" }))).toBe(false);
  });
});
