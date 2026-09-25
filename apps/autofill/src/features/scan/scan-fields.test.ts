import { detectFieldKind, normalizeLabelText } from "./field-types";
import { scanFields, scannedFieldFromElement } from "./scan-fields";

describe("normalizeLabelText", () => {
  it("strips asterisks and collapses whitespace (positive)", () => {
    expect(normalizeLabelText("Company Name *")).toBe("Company Name");
  });

  it("handles empty string (edge)", () => {
    expect(normalizeLabelText("")).toBe("");
  });
});

describe("detectFieldKind", () => {
  it("detects email from type and autocomplete (positive)", () => {
    const byType = document.createElement("input");
    byType.type = "email";
    expect(detectFieldKind(byType, "Anything")).toBe("email");

    const byAutocomplete = document.createElement("input");
    byAutocomplete.type = "text";
    byAutocomplete.setAttribute("autocomplete", "email");
    expect(detectFieldKind(byAutocomplete, "Anything")).toBe("email");
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

  it("does not treat HRMS field titles as kinds (negative)", () => {
    const input = document.createElement("input");
    input.type = "text";
    expect(detectFieldKind(input, "Salary")).toBe("text");
    expect(detectFieldKind(input, "Monthly CTC")).toBe("text");
    expect(detectFieldKind(input, "Currency")).toBe("text");
    expect(detectFieldKind(input, "Employment Type")).toBe("text");
    expect(detectFieldKind(input, "From")).toBe("text");
  });

  it("does not treat a From combobox as a date without a calendar (negative)", () => {
    const input = document.createElement("input");
    input.setAttribute("role", "combobox");
    expect(detectFieldKind(input, "From")).toBe("select");
  });

  it("keeps a combobox as select regardless of label (positive)", () => {
    const input = document.createElement("input");
    input.setAttribute("role", "combobox");
    expect(detectFieldKind(input, "Currency")).toBe("select");
    expect(detectFieldKind(input, "Employment Type")).toBe("select");
  });

  it("detects number from inputMode, not from a salary label (positive)", () => {
    const input = document.createElement("input");
    input.type = "text";
    input.inputMode = "numeric";
    expect(detectFieldKind(input, "Anything")).toBe("number");
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

  it("detects native type=date before combobox role (positive)", () => {
    const input = document.createElement("input");
    input.type = "date";
    input.setAttribute("role", "combobox");
    expect(detectFieldKind(input, "Start")).toBe("date");
  });

  it("detects a calendar combobox with no library classes (positive)", () => {
    document.body.innerHTML = `
      <div>
        <input id="start" role="combobox" aria-haspopup="dialog" />
        <button type="button" aria-label="Open calendar">📅</button>
      </div>
    `;
    const input = document.getElementById("start") as HTMLInputElement;
    expect(detectFieldKind(input, "Start")).toBe("date");
  });

  it("detects an Ant Design picker host as date (positive)", () => {
    document.body.innerHTML = `
      <div class="ant-picker">
        <input id="hired" />
      </div>
    `;
    const input = document.getElementById("hired") as HTMLInputElement;
    expect(detectFieldKind(input, "Hired")).toBe("date");
  });

  it("detects a skin-only RadComboBox_Bootstrap host as select (positive)", () => {
    document.body.innerHTML = `
      <div class="RadComboBox_Bootstrap">
        <input id="cboTitle_Input" class="rcbInput" readonly />
        <a id="cboTitle_Arrow">select</a>
      </div>
    `;
    const input = document.getElementById("cboTitle_Input") as HTMLInputElement;
    expect(detectFieldKind(input, "Title")).toBe("select");
  });

  it("detects a Telerik _Input + _Arrow pair without a host class as select (positive)", () => {
    document.body.innerHTML = `
      <input id="ctl00_cboGender_Input" readonly value="Select Gender" />
      <a id="ctl00_cboGender_Arrow">select</a>
    `;
    const input = document.getElementById(
      "ctl00_cboGender_Input",
    ) as HTMLInputElement;
    expect(detectFieldKind(input, "Gender")).toBe("select");
  });

  it("detects a RadComboBox host as select (positive)", () => {
    document.body.innerHTML = `
      <div class="RadComboBox">
        <input id="title" class="rcbInput" />
        <a class="rcbButton">v</a>
      </div>
    `;
    const input = document.getElementById("title") as HTMLInputElement;
    expect(detectFieldKind(input, "Title")).toBe("select");
  });

  it("detects a RadPicker host as date (positive)", () => {
    document.body.innerHTML = `
      <div class="RadPicker">
        <input id="dob" class="riTextBox" />
        <a class="rcCalPopup">cal</a>
      </div>
    `;
    const input = document.getElementById("dob") as HTMLInputElement;
    expect(detectFieldKind(input, "Date of Birth")).toBe("date");
  });

  it("does not treat a plain text field as select (negative)", () => {
    const input = document.createElement("input");
    input.type = "text";
    input.value = "Employee First Name";
    expect(detectFieldKind(input, "First Name")).toBe("text");
  });

  it("does not treat a text input as select because a sibling combo has an arrow (negative)", () => {
    document.body.innerHTML = `
      <input id="first" type="text" />
      <div class="RadComboBox">
        <input id="title" class="rcbInput" />
        <a class="rcbButton">v</a>
      </div>
    `;
    const first = document.getElementById("first") as HTMLInputElement;
    expect(detectFieldKind(first, "First Name")).toBe("text");
    const title = document.getElementById("title") as HTMLInputElement;
    expect(detectFieldKind(title, "Title")).toBe("select");
  });

  it("detects an ARIA combobox without library classes as select (positive)", () => {
    const input = document.createElement("input");
    input.setAttribute("role", "combobox");
    input.setAttribute("aria-haspopup", "listbox");
    expect(detectFieldKind(input, "Country")).toBe("select");
  });

  it("does not treat a plain text field as date (negative)", () => {
    const input = document.createElement("input");
    input.type = "text";
    expect(detectFieldKind(input, "Notes")).toBe("text");
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

  it("collects native inputs outside MUI FormControls on a mixed page (positive)", () => {
    document.body.innerHTML = `
      <div class="MuiFormControl-root">
        <label class="MuiInputLabel-root">Currency</label>
        <input role="combobox" />
        <input type="text" value="extra-internal" />
      </div>
      <label for="notes">Notes</label>
      <input id="notes" type="text" />
    `;
    const fields = scanFields();
    expect(fields.some((f) => f.label === "Currency")).toBe(true);
    expect(fields.some((f) => f.label === "Notes")).toBe(true);
    expect(fields).toHaveLength(2);
  });

  it("groups an Ant Design Form.Item as one field (positive)", () => {
    document.body.innerHTML = `
      <div class="ant-form-item">
        <div class="ant-form-item-label"><label>Country</label></div>
        <div class="ant-select">
          <input id="country" role="combobox" />
          <input type="text" value="search-internal" />
        </div>
      </div>
    `;
    const fields = scanFields();
    expect(fields).toHaveLength(1);
    expect(fields[0]?.label).toBe("Country");
    expect(fields[0]?.kind).toBe("select");
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

describe("scannedFieldFromElement", () => {
  it("maps a labeled text input (positive)", () => {
    document.body.innerHTML = `
      <label for="company">Company Name</label>
      <input id="company" type="text" maxlength="40" />
    `;
    const field = scannedFieldFromElement(
      document.getElementById("company") as HTMLInputElement,
    );
    expect(field.label).toBe("Company Name");
    expect(field.kind).toBe("text");
    expect(field.maxLength).toBe(40);
  });

  it("uses an unnamed fallback when there is no label (negative)", () => {
    document.body.innerHTML = `<input id="bare" type="text" />`;
    const field = scannedFieldFromElement(
      document.getElementById("bare") as HTMLInputElement,
    );
    expect(field.label).toBe("(unnamed text)");
  });

  it("maps a radio using the group label (edge)", () => {
    document.body.innerHTML = `
      <div role="radiogroup" aria-label="Government Employee">
        <label><input id="yes" type="radio" name="gov" value="Yes" />YES</label>
      </div>
    `;
    const field = scannedFieldFromElement(
      document.getElementById("yes") as HTMLInputElement,
    );
    expect(field.kind).toBe("radio");
    expect(field.label).toBe("Government Employee");
  });
});
