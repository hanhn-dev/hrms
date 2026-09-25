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

  it("treats EmptyMessage / riEmpty prompt text as empty (positive)", () => {
    const input = document.createElement("input");
    input.className = "riTextBox riEmpty";
    input.value = "Employee First Name";
    expect(hasExistingValue(input, field({ kind: "text" }))).toBe(false);
  });

  it("treats a date-mask value as empty (positive)", () => {
    const input = document.createElement("input");
    input.value = "DD-MMM-YYYY";
    expect(hasExistingValue(input, field({ kind: "date" }))).toBe(false);
  });

  it("treats Select / Enter prompts as empty (positive)", () => {
    const input = document.createElement("input");
    input.value = "Select Title";
    expect(hasExistingValue(input, field({ kind: "select" }))).toBe(false);

    const email = document.createElement("input");
    email.value = "Enter Email ID";
    expect(hasExistingValue(email, field({ kind: "email" }))).toBe(false);
  });

  it("treats a value equal to the field label as empty (positive)", () => {
    const input = document.createElement("input");
    input.value = "Country of Birth";
    expect(
      hasExistingValue(
        input,
        field({ kind: "select", label: "Country of Birth" }),
      ),
    ).toBe(false);
  });

  it("treats placeholder-equal value as empty (edge)", () => {
    const input = document.createElement("input");
    input.placeholder = "Zip Code of Birth";
    input.value = "Zip Code of Birth";
    expect(hasExistingValue(input, field({ kind: "text" }))).toBe(false);
  });

  it("returns true for a real selected country (negative)", () => {
    const input = document.createElement("input");
    input.className = "rcbInput";
    input.value = "India";
    expect(hasExistingValue(input, field({ kind: "select" }))).toBe(true);
  });

  it("treats a native select prompt option as empty (edge)", () => {
    document.body.innerHTML = `
      <select id="title">
        <option value="prompt" selected>Select Title</option>
        <option value="mr">Mr</option>
      </select>
    `;
    const select = document.getElementById("title") as HTMLSelectElement;
    expect(hasExistingValue(select, field({ kind: "select" }))).toBe(false);
  });

  it("returns true for a native select with a real option (positive)", () => {
    document.body.innerHTML = `
      <select id="title">
        <option value="">Select Title</option>
        <option value="mr" selected>Mr</option>
      </select>
    `;
    const select = document.getElementById("title") as HTMLSelectElement;
    expect(hasExistingValue(select, field({ kind: "select" }))).toBe(true);
  });
});
