import { fillFields } from "./fill-fields";
import { setNativeValue } from "./react-fill";

describe("setNativeValue", () => {
  it("sets input value and fires input event (positive)", () => {
    const input = document.createElement("input");
    let heard = false;
    input.addEventListener("input", () => {
      heard = true;
    });
    setNativeValue(input, "Acme");
    expect(input.value).toBe("Acme");
    expect(heard).toBe(true);
  });

  it("updates value when tracker would otherwise ignore (negative)", () => {
    const input = document.createElement("input");
    input.value = "same";
    (
      input as HTMLInputElement & {
        _valueTracker?: { setValue: (v: string) => void };
      }
    )._valueTracker = {
      setValue: () => {
        /* React tracker stub */
      },
    };
    setNativeValue(input, "same");
    expect(input.value).toBe("same");
  });

  it("sets empty string (edge)", () => {
    const input = document.createElement("input");
    input.value = "x";
    setNativeValue(input, "");
    expect(input.value).toBe("");
  });
});

describe("fillFields", () => {
  it("fills visible text inputs (positive)", async () => {
    document.body.innerHTML = `
      <label for="company">Company Name</label>
      <input id="company" type="text" />
    `;
    const result = await fillFields();
    expect(result.filledCount).toBe(1);
    expect(
      (document.getElementById("company") as HTMLInputElement).value.length,
    ).toBeGreaterThan(0);
  });

  it("skips disabled fields (negative)", async () => {
    document.body.innerHTML = `
      <label for="monthly">Monthly CTC</label>
      <input id="monthly" type="text" disabled />
    `;
    const result = await fillFields();
    expect(result.filledCount).toBe(0);
    expect(result.skippedCount).toBeGreaterThanOrEqual(1);
  });

  it("handles empty page (edge)", async () => {
    document.body.innerHTML = "";
    const result = await fillFields();
    expect(result.filledCount).toBe(0);
    expect(result.failedCount).toBe(0);
    expect(result.entries).toEqual([]);
  });

  it("records skipped Monthly CTC in the fill report (negative)", async () => {
    document.body.innerHTML = `
      <label for="monthly">Monthly CTC</label>
      <input id="monthly" type="text" />
      <label for="company">Company Name</label>
      <input id="company" type="text" />
    `;
    const result = await fillFields();
    expect(result.filledCount).toBe(1);
    expect(result.entries.some((e) => e.status === "skipped")).toBe(true);
    expect(
      result.entries.find((e) => /monthly/i.test(e.label))?.reason,
    ).toMatch(/Monthly CTC/i);
  });

  it("applies invalid-contact persona to email fields (positive)", async () => {
    document.body.innerHTML = `
      <label for="email">Email</label>
      <input id="email" type="email" />
    `;
    const result = await fillFields({ personaId: "invalid-contact" });
    expect(result.filledCount).toBe(1);
    expect(
      (document.getElementById("email") as HTMLInputElement).value,
    ).toBe("not-an-email");
    expect(result.entries[0]?.valuePreview).toBe("not-an-email");
  });

  it("applies bank-india IFSC fixture (edge)", async () => {
    document.body.innerHTML = `
      <label for="ifsc">IFSC Code</label>
      <input id="ifsc" type="text" />
    `;
    const result = await fillFields({ scenarioId: "bank-india" });
    expect(result.filledCount).toBe(1);
    expect(
      (document.getElementById("ifsc") as HTMLInputElement).value,
    ).toBe("HDFC0001234");
  });

  it("fills From/To DatePicker via calendar path (positive)", async () => {
    document.body.innerHTML = `
      <div class="MuiFormControl-root">
        <label class="MuiInputLabel-root">From</label>
        <input id="from" role="combobox" />
        <button type="button" aria-label="Choose date" id="open-from">open</button>
      </div>
      <div class="MuiFormControl-root">
        <label class="MuiInputLabel-root">Company Name</label>
        <input id="company" type="text" />
      </div>
    `;

    const from = document.getElementById("from") as HTMLInputElement;
    const open = document.getElementById("open-from") as HTMLButtonElement;
    open.addEventListener("click", () => {
      const popper = document.createElement("div");
      popper.className = "MuiPickersPopper-root";
      popper.innerHTML = `
        <button type="button" class="MuiPickersYear-yearButton">2018</button>
        <button type="button" class="MuiPickersYear-yearButton">2019</button>
        <button type="button" class="MuiPickersYear-yearButton">2020</button>
        <button type="button" class="MuiPickersYear-yearButton">2021</button>
        <button type="button" class="MuiPickersYear-yearButton">2022</button>
        <button type="button" class="MuiPickersYear-yearButton">2023</button>
        <button type="button" class="MuiPickersYear-yearButton">2024</button>
        <button type="button" class="MuiPickersYear-yearButton">2025</button>
      `;
      document.body.appendChild(popper);
      popper.querySelectorAll(".MuiPickersYear-yearButton").forEach((btn) => {
        btn.addEventListener("click", () => {
          const year = btn.textContent;
          popper.innerHTML = `
            <button type="button" class="MuiPickersMonth-monthButton">Jan</button>
            <button type="button" class="MuiPickersMonth-monthButton">Feb</button>
            <button type="button" class="MuiPickersMonth-monthButton">Mar</button>
            <button type="button" class="MuiPickersMonth-monthButton">Apr</button>
            <button type="button" class="MuiPickersMonth-monthButton">May</button>
            <button type="button" class="MuiPickersMonth-monthButton">Jun</button>
            <button type="button" class="MuiPickersMonth-monthButton">Jul</button>
            <button type="button" class="MuiPickersMonth-monthButton">Aug</button>
            <button type="button" class="MuiPickersMonth-monthButton">Sep</button>
            <button type="button" class="MuiPickersMonth-monthButton">Oct</button>
            <button type="button" class="MuiPickersMonth-monthButton">Nov</button>
            <button type="button" class="MuiPickersMonth-monthButton">Dec</button>
          `;
          popper
            .querySelectorAll(".MuiPickersMonth-monthButton")
            .forEach((monthBtn) => {
              monthBtn.addEventListener("click", () => {
                const month = monthBtn.textContent;
                popper.innerHTML = `
                  <button type="button" class="MuiPickersDay-root" aria-label="${month} 15, ${year}">15</button>
                  <button type="button">OK</button>
                `;
                popper
                  .querySelector(".MuiPickersDay-root")
                  ?.addEventListener("click", () => {
                    from.value = `15-${month}-${year}`;
                    popper.remove();
                  });
              });
            });
        });
      });
    });

    const result = await fillFields();
    expect(result.filledCount).toBeGreaterThanOrEqual(2);
    expect(from.value).toMatch(/^\d{2}-[A-Za-z]{3}-\d{4}$/);
    expect(
      (document.getElementById("company") as HTMLInputElement).value.length,
    ).toBeGreaterThan(0);
  });

  it("still fills when DatePicker input is readOnly (edge)", async () => {
    document.body.innerHTML = `
      <div class="MuiFormControl-root">
        <label class="MuiInputLabel-root">From</label>
        <input id="from" role="combobox" readonly />
        <button type="button" aria-label="Choose date" id="open-from">open</button>
      </div>
    `;
    const from = document.getElementById("from") as HTMLInputElement;
    const open = document.getElementById("open-from") as HTMLButtonElement;
    open.addEventListener("click", () => {
      const popper = document.createElement("div");
      popper.className = "MuiPickersPopper-root";
      popper.innerHTML = `
        <button type="button" class="MuiPickersYear-yearButton">2020</button>
      `;
      document.body.appendChild(popper);
      popper
        .querySelector(".MuiPickersYear-yearButton")
        ?.addEventListener("click", () => {
          popper.innerHTML = `
            <button type="button" class="MuiPickersMonth-monthButton">Jan</button>
          `;
          popper
            .querySelector(".MuiPickersMonth-monthButton")
            ?.addEventListener("click", () => {
              popper.innerHTML = `
                <button type="button" class="MuiPickersDay-root" aria-label="Jan 1, 2020">1</button>
              `;
              popper
                .querySelector(".MuiPickersDay-root")
                ?.addEventListener("click", () => {
                  from.value = "01-Jan-2020";
                  popper.remove();
                });
            });
        });
    });

    const result = await fillFields();
    expect(result.filledCount).toBe(1);
    expect(from.value).toMatch(/^\d{2}-[A-Za-z]{3}-\d{4}$/);
  });

  it("fills a combobox by clicking a list option (positive)", async () => {
    document.body.innerHTML = `
      <div class="MuiAutocomplete-root">
        <label class="MuiInputLabel-root">Currency</label>
        <input id="currency" role="combobox" />
        <button type="button" class="MuiAutocomplete-popupIndicator" title="Open">open</button>
      </div>
    `;
    const input = document.getElementById("currency") as HTMLInputElement;
    document
      .querySelector(".MuiAutocomplete-popupIndicator")!
      .addEventListener("click", () => {
        const popper = document.createElement("div");
        popper.className = "MuiAutocomplete-popper";
        popper.innerHTML = `
          <ul role="listbox">
            <li role="option">INR</li>
            <li role="option">USD</li>
          </ul>
        `;
        document.body.appendChild(popper);
        popper.querySelectorAll('[role="option"]').forEach((node) => {
          node.addEventListener("click", () => {
            input.value = (node.textContent || "").trim();
          });
        });
      });

    const result = await fillFields();
    expect(result.filledCount).toBe(1);
    expect(input.value).toMatch(/^(INR|USD)$/);
  });

  it("fills a combobox with a random option instead of the first (positive)", async () => {
    document.body.innerHTML = `
      <div class="MuiAutocomplete-root">
        <label class="MuiInputLabel-root">Account Type</label>
        <input id="account-type" role="combobox" />
        <button type="button" class="MuiAutocomplete-popupIndicator" title="Open">open</button>
      </div>
    `;
    const input = document.getElementById("account-type") as HTMLInputElement;
    document
      .querySelector(".MuiAutocomplete-popupIndicator")!
      .addEventListener("click", () => {
        const popper = document.createElement("div");
        popper.className = "MuiAutocomplete-popper";
        popper.innerHTML = `
          <ul role="listbox">
            <li role="option">Savings</li>
            <li role="option">Current</li>
            <li role="option">Salary</li>
          </ul>
        `;
        document.body.appendChild(popper);
        popper.querySelectorAll('[role="option"]').forEach((node) => {
          node.addEventListener("click", () => {
            input.value = (node.textContent || "").trim();
          });
        });
      });

    const random = vi.spyOn(Math, "random").mockReturnValue(0.9);
    const result = await fillFields();
    random.mockRestore();

    expect(result.filledCount).toBe(1);
    expect(input.value).toBe("Salary");
    expect(result.entries[0]?.valuePreview).toBe("Salary");
  });

  it("still fills a readOnly combobox (edge)", async () => {
    document.body.innerHTML = `
      <div class="MuiAutocomplete-root">
        <label class="MuiInputLabel-root">Currency</label>
        <input id="currency" role="combobox" readonly />
        <button type="button" class="MuiAutocomplete-popupIndicator" title="Open">open</button>
      </div>
    `;
    const input = document.getElementById("currency") as HTMLInputElement;
    document
      .querySelector(".MuiAutocomplete-popupIndicator")!
      .addEventListener("click", () => {
        const popper = document.createElement("div");
        popper.className = "MuiAutocomplete-popper";
        popper.innerHTML = `<ul role="listbox"><li role="option">EUR</li></ul>`;
        document.body.appendChild(popper);
        popper.querySelector('[role="option"]')!.addEventListener("click", () => {
          input.value = "EUR";
        });
      });

    const result = await fillFields();
    expect(result.filledCount).toBe(1);
    expect(input.value).toBe("EUR");
  });

  it("does not paint a covering overlay on the page (negative)", async () => {
    document.body.innerHTML = `
      <label for="company">Company Name</label>
      <input id="company" type="text" />
      <label for="role">Role</label>
      <input id="role" type="text" />
    `;
    await fillFields();
    expect(document.getElementById("form-autofill-fill-overlay")).toBeNull();
    expect(
      document.querySelector("[aria-label='Filling form fields']"),
    ).toBeNull();
  });

  it("checks one option in a radio group (positive)", async () => {
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
          <label>
            <input id="gov-yes" type="radio" name="gov" value="Yes" style="opacity:0" />
            YES
          </label>
          <label>
            <input id="gov-no" type="radio" name="gov" value="No" style="opacity:0" />
            NO
          </label>
        </div>
      </div>
    `;
    const result = await fillFields();
    expect(result.filledCount).toBe(3);
    const yes = document.getElementById("gov-yes") as HTMLInputElement;
    const no = document.getElementById("gov-no") as HTMLInputElement;
    expect(yes.checked || no.checked).toBe(true);
    expect(yes.checked && no.checked).toBe(false);
  });

  it("skips a radio group when every option is disabled (negative)", async () => {
    document.body.innerHTML = `
      <div role="radiogroup" aria-label="Locked">
        <label><input type="radio" name="lock" value="Yes" disabled />YES</label>
        <label><input type="radio" name="lock" value="No" disabled />NO</label>
      </div>
    `;
    const result = await fillFields();
    expect(result.filledCount).toBe(0);
  });

  it("skips an already-checked radio by default (edge)", async () => {
    document.body.innerHTML = `
      <fieldset>
        <legend>Status</legend>
        <label><input id="active" type="radio" name="status" value="a" checked />Active</label>
        <label><input id="inactive" type="radio" name="status" value="b" />Inactive</label>
      </fieldset>
    `;
    const result = await fillFields();
    expect(result.filledCount).toBe(0);
    expect(
      result.entries.find((e) => e.status === "skipped")?.reason,
    ).toBe("Already filled");
    const active = document.getElementById("active") as HTMLInputElement;
    expect(active.checked).toBe(true);
  });

  it("skips a pre-filled text input by default (negative)", async () => {
    document.body.innerHTML = `
      <label for="company">Company Name</label>
      <input id="company" type="text" value="Acme Corp" />
    `;
    const result = await fillFields();
    expect(result.filledCount).toBe(0);
    expect(result.skippedCount).toBeGreaterThanOrEqual(1);
    expect(
      result.entries.find((e) => e.status === "skipped")?.reason,
    ).toBe("Already filled");
    expect(
      (document.getElementById("company") as HTMLInputElement).value,
    ).toBe("Acme Corp");
  });

  it("fills a whitespace-only text input (edge)", async () => {
    document.body.innerHTML = `
      <label for="company">Company Name</label>
      <input id="company" type="text" value="   " />
    `;
    const result = await fillFields();
    expect(result.filledCount).toBe(1);
    expect(
      (document.getElementById("company") as HTMLInputElement).value.trim()
        .length,
    ).toBeGreaterThan(0);
  });

  it("overwrites a pre-filled text input when overwrite is enabled (positive)", async () => {
    document.body.innerHTML = `
      <label for="company">Company Name</label>
      <input id="company" type="text" value="Acme Corp" />
    `;
    const result = await fillFields({ overwriteExistingValues: true });
    expect(result.filledCount).toBe(1);
    expect(
      (document.getElementById("company") as HTMLInputElement).value,
    ).not.toBe("Acme Corp");
  });

  it("fills Bank Identifier Code without using leftover Account Type options (positive)", async () => {
    document.body.innerHTML = `
      <div class="MuiFormControl-root">
        <label class="MuiInputLabel-root">Account Type</label>
        <div class="MuiAutocomplete-root">
          <input id="account-type" role="combobox" />
          <button type="button" class="MuiAutocomplete-popupIndicator" id="open-type" title="Open">open</button>
        </div>
      </div>
      <div id="ifsc-row">
        <div class="MuiFormControl-root">
          <label class="MuiInputLabel-root">Bank Identifier Code</label>
          <div class="MuiAutocomplete-root">
            <input id="ifsc" role="combobox" />
            <button type="button" class="MuiAutocomplete-popupIndicator" id="open-ifsc" title="Open">open</button>
          </div>
        </div>
        <button type="button" id="validate" disabled>Validate</button>
      </div>
      <div class="MuiFormControl-root">
        <label class="MuiInputLabel-root">Bank Name</label>
        <input id="bank-name" disabled />
      </div>
      <div class="MuiFormControl-root">
        <label class="MuiInputLabel-root">Branch Name</label>
        <input id="branch-name" disabled />
      </div>
    `;
    const accountType = document.getElementById(
      "account-type",
    ) as HTMLInputElement;
    const ifsc = document.getElementById("ifsc") as HTMLInputElement;
    const bankName = document.getElementById("bank-name") as HTMLInputElement;
    const branchName = document.getElementById(
      "branch-name",
    ) as HTMLInputElement;
    const validate = document.getElementById("validate") as HTMLButtonElement;

    document.getElementById("open-type")!.addEventListener("click", () => {
      const popper = document.createElement("div");
      popper.className = "MuiAutocomplete-popper";
      popper.innerHTML = `<ul role="listbox"><li role="option">Savings</li></ul>`;
      document.body.appendChild(popper);
      popper.querySelector('[role="option"]')!.addEventListener("click", () => {
        accountType.value = "Savings";
      });
    });
    document.getElementById("open-ifsc")!.addEventListener("click", () => {
      const popper = document.createElement("div");
      popper.className = "MuiAutocomplete-popper";
      popper.innerHTML = `<ul role="listbox"><li role="option">HDFC0001234</li></ul>`;
      document.body.appendChild(popper);
      popper.querySelector('[role="option"]')!.addEventListener("click", () => {
        ifsc.value = "HDFC0001234";
        validate.disabled = false;
      });
    });
    validate.addEventListener("click", () => {
      bankName.value = "HDFC Bank";
      branchName.value = "MG Road";
    });

    const result = await fillFields();
    expect(accountType.value).toBe("Savings");
    expect(ifsc.value).toBe("HDFC0001234");
    expect(result.filledCount).toBeGreaterThanOrEqual(2);
    expect(result.skippedCount).toBeGreaterThanOrEqual(2);
  });

  it("clicks Validate after typing an IFSC with an empty master list (positive)", async () => {
    document.body.innerHTML = `
      <div class="MuiFormControl-root">
        <label class="MuiInputLabel-root">Account Number</label>
        <input id="account-number" type="text" />
      </div>
      <div id="ifsc-row">
        <div class="MuiFormControl-root">
          <label class="MuiInputLabel-root">Bank Identifier Code</label>
          <input id="ifsc" role="combobox" />
        </div>
        <button type="button" id="validate" disabled>Validate</button>
      </div>
      <div class="MuiFormControl-root">
        <label class="MuiInputLabel-root">Bank Name</label>
        <input id="bank-name" disabled />
      </div>
    `;
    const ifsc = document.getElementById("ifsc") as HTMLInputElement;
    const validate = document.getElementById("validate") as HTMLButtonElement;
    const bankName = document.getElementById("bank-name") as HTMLInputElement;
    ifsc.addEventListener("input", () => {
      if (/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(ifsc.value)) {
        validate.disabled = false;
      }
    });
    validate.addEventListener("click", () => {
      bankName.value = "State Bank of India";
    });

    await fillFields();
    expect(ifsc.value).toMatch(/^[A-Z]{4}0[A-Z0-9]{6}$/i);
    expect(bankName.value).toBe("State Bank of India");
  });

  it("does not click a disabled Validate button (negative)", async () => {
    document.body.innerHTML = `
      <div class="MuiFormControl-root">
        <label class="MuiInputLabel-root">Account Number</label>
        <input id="account-number" type="text" />
      </div>
      <div id="ifsc-row">
        <div class="MuiFormControl-root">
          <label class="MuiInputLabel-root">Bank Identifier Code</label>
          <input id="ifsc" role="combobox" />
        </div>
        <button type="button" id="validate" disabled>Validate</button>
      </div>
    `;
    const validate = document.getElementById("validate") as HTMLButtonElement;
    let clicked = false;
    validate.addEventListener("click", () => {
      clicked = true;
    });
    Object.defineProperty(validate, "disabled", {
      get: () => true,
      configurable: true,
    });

    await fillFields();
    expect(clicked).toBe(false);
  });

  it("leaves disabled Bank Name empty when Validate is absent (edge)", async () => {
    document.body.innerHTML = `
      <div class="MuiFormControl-root">
        <label class="MuiInputLabel-root">Bank Identifier Code</label>
        <input id="ifsc" role="combobox" />
      </div>
      <div class="MuiFormControl-root">
        <label class="MuiInputLabel-root">Bank Name</label>
        <input id="bank-name" disabled />
      </div>
      <div class="MuiFormControl-root">
        <label class="MuiInputLabel-root">Branch Name</label>
        <input id="branch-name" disabled />
      </div>
    `;
    const ifsc = document.getElementById("ifsc") as HTMLInputElement;
    await fillFields();
    expect(ifsc.value).toMatch(/^[A-Z]{4}0[A-Z0-9]{6}$/i);
    expect(
      (document.getElementById("bank-name") as HTMLInputElement).value,
    ).toBe("");
    expect(
      (document.getElementById("branch-name") as HTMLInputElement).value,
    ).toBe("");
  });

  it("fills a mixed native select and ARIA combobox (positive)", async () => {
    document.body.innerHTML = `
      <label for="status">Status</label>
      <select id="status">
        <option value="">Select</option>
        <option value="open">Open</option>
        <option value="closed">Closed</option>
      </select>
      <label for="country">Country</label>
      <input id="country" role="combobox" />
    `;
    const country = document.getElementById("country") as HTMLInputElement;
    country.addEventListener("click", () => {
      const list = document.createElement("ul");
      list.setAttribute("role", "listbox");
      list.innerHTML = `<li role="option">India</li>`;
      document.body.appendChild(list);
      list.querySelector('[role="option"]')!.addEventListener("click", () => {
        country.value = "India";
      });
    });
    const result = await fillFields();
    expect(result.failedCount).toBe(0);
    expect(result.filledCount).toBe(2);
    const status = document.getElementById("status") as HTMLSelectElement;
    expect(status.value).toMatch(/^(open|closed)$/);
    expect(country.value).toBe("India");
  });

  it("fills an Ant Design-like select (positive)", async () => {
    document.body.innerHTML = `
      <div class="ant-form-item">
        <div class="ant-form-item-label"><label>Currency</label></div>
        <div class="ant-select">
          <input id="currency" role="combobox" />
          <span class="ant-select-arrow">v</span>
        </div>
      </div>
    `;
    const input = document.getElementById("currency") as HTMLInputElement;
    document.querySelector(".ant-select-arrow")!.addEventListener("click", () => {
      const dropdown = document.createElement("div");
      dropdown.className = "ant-select-dropdown";
      dropdown.innerHTML = `<div class="ant-select-item-option">EUR</div>`;
      document.body.appendChild(dropdown);
      dropdown
        .querySelector(".ant-select-item-option")!
        .addEventListener("click", () => {
          input.value = "EUR";
        });
    });
    const result = await fillFields();
    expect(result.filledCount).toBe(1);
    expect(input.value).toBe("EUR");
  });

  it("fills a readonly Telerik combo that has no RadComboBox host class (positive)", async () => {
    document.body.innerHTML = `
      <label for="cboGender_Input">Gender</label>
      <input id="cboGender_Input" class="rcbInput rcbEmptyMessage" readonly value="Select Gender" />
      <a id="cboGender_Arrow">select</a>
    `;
    const input = document.getElementById("cboGender_Input") as HTMLInputElement;
    vi.stubGlobal("chrome", {
      runtime: {
        sendMessage: vi.fn().mockResolvedValue({ ok: true, text: "Male" }),
      },
    });
    const result = await fillFields();
    vi.unstubAllGlobals();
    expect(result.filledCount).toBe(1);
    expect(result.failedCount).toBe(0);
    expect(input.value).toBe("Male");
  });

  it("fills a readonly combo whose EmptyMessage matches the label (positive)", async () => {
    document.body.innerHTML = `
      <div class="RadComboBox_Bootstrap" id="cboCountry">
        <label for="cboCountry_Input">Country of Birth</label>
        <input id="cboCountry_Input" class="rcbInput" readonly value="Country of Birth" />
        <a id="cboCountry_Arrow">select</a>
      </div>
      <div class="RadComboBoxDropDown" id="cboCountry_DropDown">
        <ul class="rcbList">
          <li class="rcbItem">India</li>
          <li class="rcbItem">Singapore</li>
        </ul>
      </div>
    `;
    const input = document.getElementById(
      "cboCountry_Input",
    ) as HTMLInputElement;
    document.querySelectorAll(".rcbItem").forEach((node) => {
      node.addEventListener("click", () => {
        input.value = (node.textContent || "").trim();
      });
    });
    const random = vi.spyOn(Math, "random").mockReturnValue(0);
    const result = await fillFields();
    random.mockRestore();
    expect(result.filledCount).toBe(1);
    expect(result.skippedCount).toBe(0);
    expect(input.value).toBe("India");
    expect(input.value).not.toBe("Country of Birth");
  });

  it("fills a Telerik-like text, combo, and date fixture (positive)", async () => {
    document.body.innerHTML = `
      <label for="first">First Name</label>
      <input id="first" class="riTextBox riEmpty" value="Employee First Name" />
      <div class="RadComboBox">
        <label for="title">Title</label>
        <input id="title" class="rcbInput rcbEmptyMessage" value="Select Title" />
        <a class="rcbButton">v</a>
        <div class="rcbSlide">
          <ul class="rcbList">
            <li class="rcbItem">Mr</li>
            <li class="rcbItem">Ms</li>
          </ul>
        </div>
      </div>
      <div class="RadPicker">
        <label for="dob">Date of Birth</label>
        <input id="dob" class="riTextBox riEmpty" value="DD-MMM-YYYY" />
        <a class="rcCalPopup">cal</a>
      </div>
    `;
    const title = document.getElementById("title") as HTMLInputElement;
    document.querySelectorAll(".rcbItem").forEach((node) => {
      node.addEventListener("click", () => {
        title.value = (node.textContent || "").trim();
        title.classList.remove("rcbEmptyMessage");
      });
    });
    const random = vi.spyOn(Math, "random").mockReturnValue(0);
    const result = await fillFields();
    random.mockRestore();
    expect(result.filledCount).toBe(3);
    expect(result.failedCount).toBe(0);
    const first = document.getElementById("first") as HTMLInputElement;
    const dob = document.getElementById("dob") as HTMLInputElement;
    expect(first.value).not.toBe("Employee First Name");
    expect(first.value.length).toBeGreaterThan(0);
    expect(title.value).toBe("Mr");
    expect(dob.value).toMatch(/^\d{2}-[A-Za-z]{3}-\d{4}$/);
  });

  it("skips an already-selected combo by default (negative)", async () => {
    document.body.innerHTML = `
      <div class="RadComboBox">
        <label for="country">Country of Employment</label>
        <input id="country" class="rcbInput" value="India" />
        <a class="rcbButton">v</a>
        <div class="rcbSlide">
          <ul class="rcbList">
            <li class="rcbItem">India</li>
            <li class="rcbItem">Singapore</li>
          </ul>
        </div>
      </div>
    `;
    const result = await fillFields();
    expect(result.filledCount).toBe(0);
    expect(result.skippedCount).toBeGreaterThanOrEqual(1);
    expect(
      result.entries.find((e) => e.status === "skipped")?.reason,
    ).toBe("Already filled");
    expect(
      (document.getElementById("country") as HTMLInputElement).value,
    ).toBe("India");
  });

  it("fills AutoPostBack combos after other fields (edge)", async () => {
    const order: string[] = [];
    document.body.innerHTML = `
      <label for="first">First Name</label>
      <input id="first" type="text" />
      <div class="RadComboBox">
        <label for="marital">Marital Status</label>
        <input id="marital" class="rcbInput rcbEmptyMessage" value="Select Status" />
        <a class="rcbButton">v</a>
        <a hidden href="javascript:__doPostBack('cboMarital','')"></a>
        <div class="rcbSlide">
          <ul class="rcbList">
            <li class="rcbItem">Single</li>
          </ul>
        </div>
      </div>
    `;
    const first = document.getElementById("first") as HTMLInputElement;
    const marital = document.getElementById("marital") as HTMLInputElement;
    first.addEventListener("input", () => {
      order.push("first");
    });
    document.querySelector(".rcbItem")!.addEventListener("click", () => {
      order.push("marital");
      marital.value = "Single";
      marital.classList.remove("rcbEmptyMessage");
    });
    const result = await fillFields();
    expect(result.filledCount).toBe(2);
    expect(order[0]).toBe("first");
    expect(order[order.length - 1]).toBe("marital");
  });

  it("reports a tactic reason when the listbox is empty (negative)", async () => {
    document.body.innerHTML = `
      <label for="currency">Currency</label>
      <input id="currency" role="combobox" />
    `;
    const result = await fillFields();
    expect(result.failedCount).toBe(1);
    expect(result.entries[0]?.reason).toMatch(/listbox-option/);
  });
});
