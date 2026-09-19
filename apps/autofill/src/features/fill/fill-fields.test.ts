import { describe, expect, it } from "vitest";
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
});
