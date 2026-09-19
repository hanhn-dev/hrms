import { describe, expect, it } from "vitest";
import { detectFieldKind, normalizeLabelText } from "./field-types";
import { scanFields } from "./scan-fields";

describe("normalizeLabelText", () => {
  it("strips asterisks and collapses whitespace (positive)", () => {
    expect(normalizeLabelText("Company Name *")).toBe("Company Name");
  });

  it("handles empty string (edge)", () => {
    expect(normalizeLabelText("")).toBe("");
  });
});

describe("detectFieldKind", () => {
  it("detects email from label (positive)", () => {
    const input = document.createElement("input");
    input.type = "text";
    expect(detectFieldKind(input, "Contact Person Email Id")).toBe("email");
  });

  it("detects phone from type=tel (positive)", () => {
    const input = document.createElement("input");
    input.type = "tel";
    expect(detectFieldKind(input, "Other")).toBe("phone");
  });

  it("returns text for unknown labels (negative)", () => {
    const input = document.createElement("input");
    input.type = "text";
    expect(detectFieldKind(input, "Something Else")).toBe("text");
  });

  it("detects From/To DatePicker even with role=combobox (positive)", () => {
    const input = document.createElement("input");
    input.setAttribute("role", "combobox");
    expect(detectFieldKind(input, "From")).toBe("date");
    expect(detectFieldKind(input, "To")).toBe("date");
  });

  it("keeps Currency combobox as select (negative)", () => {
    const input = document.createElement("input");
    input.setAttribute("role", "combobox");
    expect(detectFieldKind(input, "Currency")).toBe("select");
  });

  it("detects date via calendar adornment when label is generic (edge)", () => {
    document.body.innerHTML = `
      <div class="MuiFormControl-root">
        <input id="tenure" role="combobox" />
        <button type="button" aria-label="Choose date">📅</button>
      </div>
    `;
    const input = document.getElementById("tenure") as HTMLInputElement;
    expect(detectFieldKind(input, "Tenure")).toBe("date");
  });

  it("detects radio inputs as radio (positive)", () => {
    const input = document.createElement("input");
    input.type = "radio";
    expect(detectFieldKind(input, "Government Employee")).toBe("radio");
  });

  it("does not classify a text input as radio (negative)", () => {
    const input = document.createElement("input");
    input.type = "text";
    expect(detectFieldKind(input, "Government Employee")).toBe("text");
  });

  it("keeps type=radio even when role is combobox (edge)", () => {
    const input = document.createElement("input");
    input.type = "radio";
    input.setAttribute("role", "combobox");
    expect(detectFieldKind(input, "From")).toBe("radio");
  });
});

describe("scanFields", () => {
  it("finds visible labeled inputs (positive)", () => {
    document.body.innerHTML = `
      <label for="company">Company Name</label>
      <input id="company" type="text" />
      <label for="notes">Key Experience</label>
      <textarea id="notes"></textarea>
    `;
    const fields = scanFields();
    expect(fields.some((f) => f.label === "Company Name")).toBe(true);
    expect(fields.some((f) => f.kind === "textarea")).toBe(true);
  });

  it("counts one field per MUI FormControl even with extra inner inputs (positive)", () => {
    document.body.innerHTML = `
      <div class="MuiFormControl-root">
        <label class="MuiInputLabel-root">Currency</label>
        <input role="combobox" />
        <input type="text" value="extra-internal" />
      </div>
      <div class="MuiFormControl-root">
        <label class="MuiInputLabel-root">Company Name</label>
        <input id="company" type="text" />
      </div>
    `;
    const fields = scanFields();
    expect(fields).toHaveLength(2);
    expect(fields.map((f) => f.label).sort()).toEqual([
      "Company Name",
      "Currency",
    ]);
  });

  it("merges dial combobox + tel into one phone field (positive)", () => {
    document.body.innerHTML = `
      <div class="MuiFormControl-root">
        <input role="combobox" value="+91" aria-label="Country" />
      </div>
      <div class="MuiFormControl-root">
        <label class="MuiInputLabel-root">Contact Person Mobile No</label>
        <input type="tel" placeholder="1234567890" />
      </div>
    `;
    const fields = scanFields();
    expect(fields).toHaveLength(1);
    expect(fields[0]?.kind).toBe("phone");
  });

  it("skips hidden and button inputs (negative)", () => {
    document.body.innerHTML = `
      <input type="hidden" name="token" value="x" />
      <input type="submit" value="Save" />
      <input id="ok" type="text" aria-label="Roles" />
    `;
    const fields = scanFields();
    expect(fields).toHaveLength(1);
    expect(fields[0]?.label).toBe("Roles");
  });

  it("handles empty document (edge)", () => {
    document.body.innerHTML = "";
    expect(scanFields()).toEqual([]);
  });

  it("finds a MUI-X sectioned DatePicker via its hidden compatibility input (positive)", () => {
    // enableAccessibleFieldDOMStructure (MUI X default: true) renders the
    // editable surface as <span role="spinbutton"> sections with no visible
    // <input>; only a hidden, aria-hidden <input> exists for autofill tools.
    // Two+ FormControls are required to take the MUI-aware collection path
    // (matches every real page, which always has multiple fields).
    document.body.innerHTML = `
      <div class="MuiFormControl-root">
        <label class="MuiInputLabel-root">Company Name</label>
        <input id="company" type="text" />
      </div>
      <div class="MuiFormControl-root">
        <label class="MuiInputLabel-root">From</label>
        <div class="MuiPickersSectionList-root">
          <span role="spinbutton" aria-label="Day">DD</span>
          <span role="spinbutton" aria-label="Month">MMM</span>
          <span role="spinbutton" aria-label="Year">YYYY</span>
        </div>
        <input aria-hidden="true" tabindex="-1" style="opacity:0" />
      </div>
    `;
    const fields = scanFields();
    const dateField = fields.find((f) => f.label === "From");
    expect(dateField?.kind).toBe("date");
  });

  it("does not surface a FormControl with no usable input and no sectioned date markers (negative)", () => {
    document.body.innerHTML = `
      <div class="MuiFormControl-root">
        <label class="MuiInputLabel-root">Company Name</label>
        <input id="company" type="text" />
      </div>
      <div class="MuiFormControl-root">
        <label class="MuiInputLabel-root">Ghost Field</label>
        <input aria-hidden="true" tabindex="-1" style="opacity:0" />
      </div>
    `;
    const fields = scanFields();
    expect(fields.some((f) => f.label === "Ghost Field")).toBe(false);
  });

  it("scans a MUI radio group as one field using the sibling label (positive)", () => {
    document.body.innerHTML = `
      <div class="MuiFormControl-root">
        <label class="MuiInputLabel-root">Name</label>
        <input id="name" type="text" />
      </div>
      <div class="MuiFormControl-root">
        <label class="MuiInputLabel-root">Address</label>
        <input id="address" type="text" />
      </div>
      <div>
        <span>GOVERMENT EMPLOYEE</span>
        <div role="radiogroup">
          <label class="MuiFormControlLabel-root">
            <span class="MuiRadio-root">
              <input type="radio" name="gov" value="Yes" style="opacity:0" />
            </span>
            YES
          </label>
          <label class="MuiFormControlLabel-root">
            <span class="MuiRadio-root">
              <input type="radio" name="gov" value="No" style="opacity:0" />
            </span>
            NO
          </label>
        </div>
      </div>
    `;
    const fields = scanFields();
    const radio = fields.find((f) => f.label === "GOVERMENT EMPLOYEE");
    expect(radio?.kind).toBe("radio");
    expect(fields.filter((f) => f.kind === "radio")).toHaveLength(1);
  });

  it("does not emit one field per radio option (negative)", () => {
    document.body.innerHTML = `
      <fieldset>
        <legend>Status</legend>
        <label><input type="radio" name="status" value="a" />Active</label>
        <label><input type="radio" name="status" value="b" />Inactive</label>
      </fieldset>
    `;
    const fields = scanFields();
    expect(fields.filter((f) => f.kind === "radio")).toHaveLength(1);
    expect(fields.some((f) => f.label === "YES" || f.label === "NO")).toBe(
      false,
    );
  });

  it("skips a radio group when every option is disabled (edge)", () => {
    document.body.innerHTML = `
      <div role="radiogroup" aria-label="Locked">
        <label><input type="radio" name="lock" value="Yes" disabled />YES</label>
        <label><input type="radio" name="lock" value="No" disabled />NO</label>
      </div>
    `;
    const fields = scanFields();
    expect(fields.some((f) => f.label === "Locked")).toBe(false);
  });
});
