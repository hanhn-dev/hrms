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

  it("leaves an already-checked radio checked (edge)", async () => {
    document.body.innerHTML = `
      <fieldset>
        <legend>Status</legend>
        <label><input id="active" type="radio" name="status" value="a" checked />Active</label>
        <label><input id="inactive" type="radio" name="status" value="b" />Inactive</label>
      </fieldset>
    `;
    const result = await fillFields();
    expect(result.filledCount).toBe(1);
    const active = document.getElementById("active") as HTMLInputElement;
    const inactive = document.getElementById("inactive") as HTMLInputElement;
    expect(active.checked || inactive.checked).toBe(true);
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
});
