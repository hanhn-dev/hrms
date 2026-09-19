import { describe, expect, it, vi } from "vitest";
import { dismissOpenOverlays, fillAutocomplete } from "./react-fill";

describe("dismissOpenOverlays", () => {
  it("hides Autocomplete poppers without detaching them (positive)", () => {
    document.body.innerHTML = `
      <div class="MuiAutocomplete-popper" id="list">options</div>
      <div class="MuiDialog-root" id="form">form</div>
    `;
    const list = document.getElementById("list") as HTMLElement;
    dismissOpenOverlays();
    expect(document.getElementById("list")).toBe(list);
    expect(list.parentNode).toBe(document.body);
    expect(list.style.visibility).toBe("hidden");
    expect(list.style.pointerEvents).toBe("none");
    expect(document.getElementById("form")).toBeTruthy();
  });

  it("does not hide the form dialog or drawer (negative)", () => {
    document.body.innerHTML = `
      <div class="MuiModal-root" id="modal">
        <div class="MuiBackdrop-root" id="backdrop"></div>
        <div class="MuiDialog-root" id="dialog">edit form</div>
      </div>
      <div class="MuiDrawer-root" id="drawer">drawer form</div>
    `;
    dismissOpenOverlays();
    expect(document.getElementById("modal")).toBeTruthy();
    expect(document.getElementById("backdrop")).toBeTruthy();
    expect(document.getElementById("dialog")).toBeTruthy();
    expect(document.getElementById("drawer")).toBeTruthy();
    expect(
      (document.getElementById("dialog") as HTMLElement).style.visibility,
    ).not.toBe("hidden");
  });

  it("is a no-op when no pickers are open (edge)", () => {
    document.body.innerHTML = `<form id="plain"><input /></form>`;
    dismissOpenOverlays();
    expect(document.getElementById("plain")).toBeTruthy();
  });
});

describe("fillAutocomplete", () => {
  it("clicks a matching list option (positive)", async () => {
    document.body.innerHTML = `
      <div class="MuiAutocomplete-root">
        <label>Currency</label>
        <input id="currency" role="combobox" />
        <button type="button" class="MuiAutocomplete-popupIndicator" title="Open">open</button>
      </div>
    `;
    const input = document.getElementById("currency") as HTMLInputElement;
    const open = document.querySelector(
      ".MuiAutocomplete-popupIndicator",
    ) as HTMLButtonElement;
    open.addEventListener("click", () => {
      const popper = document.createElement("div");
      popper.className = "MuiAutocomplete-popper";
      popper.innerHTML = `
        <ul role="listbox">
          <li role="option">EUR</li>
          <li role="option">INR</li>
          <li role="option">USD</li>
        </ul>
      `;
      document.body.appendChild(popper);
      popper.querySelectorAll('[role="option"]').forEach((node) => {
        node.addEventListener("click", () => {
          input.value = (node.textContent || "").trim();
          popper.style.display = "none";
        });
      });
    });

    await fillAutocomplete(input, "INR");
    expect(input.value).toBe("INR");
    expect(document.querySelector(".MuiAutocomplete-popper")).toBeTruthy();
  });

  it("selects a native <select> option and skips the empty placeholder (negative)", async () => {
    document.body.innerHTML = `
      <select id="currency">
        <option value="">Select</option>
        <option value="INR">INR</option>
        <option value="USD" disabled>USD</option>
      </select>
    `;
    const select = document.getElementById("currency") as HTMLSelectElement;
    await fillAutocomplete(select, "USD");
    expect(select.value).toBe("INR");
  });

  it("picks the first option when preferred is empty (edge)", async () => {
    document.body.innerHTML = `
      <div class="MuiAutocomplete-root">
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
            <li role="option" aria-disabled="true">None</li>
            <li role="option">GBP</li>
          </ul>
        `;
        document.body.appendChild(popper);
        popper.querySelectorAll('[role="option"]').forEach((node) => {
          node.addEventListener("click", () => {
            input.value = (node.textContent || "").trim();
          });
        });
      });

    await fillAutocomplete(input, "");
    expect(input.value).toBe("GBP");
  });

  it("does nothing when the list has no options (negative)", async () => {
    document.body.innerHTML = `<input id="currency" role="combobox" />`;
    const input = document.getElementById("currency") as HTMLInputElement;
    const spy = vi.spyOn(input, "focus");
    await fillAutocomplete(input, "INR");
    expect(input.value).toBe("");
    expect(spy).not.toHaveBeenCalled();
  });
});
