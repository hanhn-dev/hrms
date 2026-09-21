import { dismissOpenOverlays, fillAutocomplete, fillRadio } from "./react-fill";

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
      <div class="ant-modal" id="antd-modal">antd form</div>
    `;
    dismissOpenOverlays();
    expect(document.getElementById("modal")).toBeTruthy();
    expect(document.getElementById("backdrop")).toBeTruthy();
    expect(document.getElementById("dialog")).toBeTruthy();
    expect(document.getElementById("drawer")).toBeTruthy();
    expect(document.getElementById("antd-modal")).toBeTruthy();
    expect(
      (document.getElementById("dialog") as HTMLElement).style.visibility,
    ).not.toBe("hidden");
    expect(
      (document.getElementById("antd-modal") as HTMLElement).style.visibility,
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

  it("picks a random native <select> option when preferred does not match (positive)", async () => {
    document.body.innerHTML = `
      <select id="currency">
        <option value="">Select</option>
        <option value="EUR">EUR</option>
        <option value="INR">INR</option>
        <option value="USD">USD</option>
      </select>
    `;
    const select = document.getElementById("currency") as HTMLSelectElement;
    const random = vi.spyOn(Math, "random").mockReturnValue(0.9);

    await fillAutocomplete(select, "not-a-currency");

    random.mockRestore();
    expect(select.value).toBe("USD");
  });

  it("skips a native <select> placeholder when choosing at random (edge)", async () => {
    document.body.innerHTML = `
      <select id="country">
        <option value="prompt">Select country</option>
        <option value="IN">India</option>
        <option value="SG">Singapore</option>
      </select>
    `;
    const select = document.getElementById("country") as HTMLSelectElement;
    const random = vi.spyOn(Math, "random").mockReturnValue(0);

    await fillAutocomplete(select, "");

    random.mockRestore();
    expect(select.value).toBe("IN");
  });

  function mountAutocomplete(optionHtml: string): HTMLInputElement {
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
        popper.innerHTML = `<ul role="listbox">${optionHtml}</ul>`;
        document.body.appendChild(popper);
        popper.querySelectorAll('[role="option"]').forEach((node) => {
          node.addEventListener("click", () => {
            input.value = (node.textContent || "").trim();
          });
        });
      });
    return input;
  }

  it("picks a random enabled option when preferred is empty (edge)", async () => {
    const input = mountAutocomplete(`
      <li role="option" aria-disabled="true">None</li>
      <li role="option">EUR</li>
      <li role="option">INR</li>
      <li role="option">USD</li>
    `);
    const random = vi.spyOn(Math, "random").mockReturnValue(0.9);

    await fillAutocomplete(input, "");

    random.mockRestore();
    expect(input.value).toBe("USD");
  });

  it("does not fall back to the first option when preferred is missing (negative)", async () => {
    const input = mountAutocomplete(`
      <li role="option">EUR</li>
      <li role="option">INR</li>
      <li role="option">USD</li>
    `);
    const random = vi.spyOn(Math, "random").mockReturnValue(0.5);

    await fillAutocomplete(input, "ZZZ-not-a-currency");

    random.mockRestore();
    expect(input.value).toBe("INR");
    expect(input.value).not.toBe("EUR");
  });

  it("skips a placeholder row when choosing at random (edge)", async () => {
    const input = mountAutocomplete(`
      <li role="option">Select country</li>
      <li role="option">India</li>
      <li role="option">Singapore</li>
    `);
    const random = vi.spyOn(Math, "random").mockReturnValue(0);

    await fillAutocomplete(input, "");

    random.mockRestore();
    expect(input.value).toBe("India");
  });

  it("does not pick leftover options from another Autocomplete (negative)", async () => {
    document.body.innerHTML = `
      <div class="MuiAutocomplete-root">
        <label>Account Type</label>
        <input id="account-type" role="combobox" />
      </div>
      <div class="MuiAutocomplete-popper" id="leftover">
        <ul role="listbox">
          <li role="option">Savings</li>
          <li role="option">Current</li>
        </ul>
      </div>
      <div class="MuiAutocomplete-root">
        <label>Bank Identifier Code</label>
        <input id="ifsc" role="combobox" />
        <button type="button" class="MuiAutocomplete-popupIndicator" title="Open">open</button>
      </div>
    `;
    const leftover = document.getElementById("leftover") as HTMLElement;
    leftover.querySelectorAll('[role="option"]').forEach((node) => {
      node.addEventListener("click", () => {
        leftover.dataset.picked = (node.textContent || "").trim();
      });
    });
    const input = document.getElementById("ifsc") as HTMLInputElement;
    document
      .querySelector(".MuiAutocomplete-popupIndicator")!
      .addEventListener("click", () => {
        const popper = document.createElement("div");
        popper.className = "MuiAutocomplete-popper";
        popper.innerHTML = `
          <ul role="listbox">
            <li role="option">HDFC0001234</li>
            <li role="option">SBIN0005943</li>
          </ul>
        `;
        document.body.appendChild(popper);
        popper.querySelectorAll('[role="option"]').forEach((node) => {
          node.addEventListener("click", () => {
            input.value = (node.textContent || "").trim();
          });
        });
      });

    await fillAutocomplete(input, "SBIN0005943");
    expect(input.value).toBe("SBIN0005943");
    expect(leftover.dataset.picked).toBeUndefined();
  });

  it("types an IFSC when this combobox has no options (positive)", async () => {
    document.body.innerHTML = `
      <div class="MuiAutocomplete-popper">
        <ul role="listbox"><li role="option">Savings</li></ul>
      </div>
      <input id="ifsc" role="combobox" />
    `;
    const input = document.getElementById("ifsc") as HTMLInputElement;
    await fillAutocomplete(input, "SBIN0005943", { allowTypedValue: true });
    expect(input.value).toBe("SBIN0005943");
  });

  it("does nothing when the list has no options (negative)", async () => {
    document.body.innerHTML = `<input id="currency" role="combobox" />`;
    const input = document.getElementById("currency") as HTMLInputElement;
    const spy = vi.spyOn(input, "focus");
    await fillAutocomplete(input, "INR");
    expect(input.value).toBe("");
    expect(spy).not.toHaveBeenCalled();
  });

  it("does not type into a readOnly combobox without options (edge)", async () => {
    document.body.innerHTML = `<input id="ifsc" role="combobox" readonly />`;
    const input = document.getElementById("ifsc") as HTMLInputElement;
    await fillAutocomplete(input, "SBIN0005943", { allowTypedValue: true });
    expect(input.value).toBe("");
  });

  it("picks an ARIA listbox option with no library classes (positive)", async () => {
    document.body.innerHTML = `<input id="country" role="combobox" aria-haspopup="listbox" />`;
    const input = document.getElementById("country") as HTMLInputElement;
    input.addEventListener("click", () => {
      const list = document.createElement("ul");
      list.setAttribute("role", "listbox");
      list.innerHTML = `
        <li role="option">India</li>
        <li role="option">Singapore</li>
      `;
      document.body.appendChild(list);
      list.querySelectorAll('[role="option"]').forEach((node) => {
        node.addEventListener("click", () => {
          input.value = (node.textContent || "").trim();
        });
      });
    });
    const random = vi.spyOn(Math, "random").mockReturnValue(0);
    await fillAutocomplete(input);
    random.mockRestore();
    expect(input.value).toBe("India");
  });

  it("picks an Ant Design Select option from a new dropdown (positive)", async () => {
    document.body.innerHTML = `
      <div class="ant-select">
        <input id="country" role="combobox" />
        <span class="ant-select-arrow">v</span>
      </div>
    `;
    const input = document.getElementById("country") as HTMLInputElement;
    document.querySelector(".ant-select-arrow")!.addEventListener("click", () => {
      const dropdown = document.createElement("div");
      dropdown.className = "ant-select-dropdown";
      dropdown.innerHTML = `
        <div class="ant-select-item-option">INR</div>
        <div class="ant-select-item-option">USD</div>
      `;
      document.body.appendChild(dropdown);
      dropdown.querySelectorAll(".ant-select-item-option").forEach((node) => {
        node.addEventListener("click", () => {
          input.value = (node.textContent || "").trim();
        });
      });
    });
    await fillAutocomplete(input, "USD");
    expect(input.value).toBe("USD");
  });

  it("does not reuse a leftover ARIA listbox from another field (negative)", async () => {
    document.body.innerHTML = `
      <ul role="listbox" id="leftover">
        <li role="option">Savings</li>
      </ul>
      <input id="currency" role="combobox" />
    `;
    const leftover = document.getElementById("leftover") as HTMLElement;
    leftover.querySelectorAll('[role="option"]').forEach((node) => {
      node.addEventListener("click", () => {
        leftover.dataset.picked = (node.textContent || "").trim();
      });
    });
    const input = document.getElementById("currency") as HTMLInputElement;
    input.addEventListener("click", () => {
      const list = document.createElement("ul");
      list.setAttribute("role", "listbox");
      list.innerHTML = `<li role="option">EUR</li>`;
      document.body.appendChild(list);
      list.querySelector('[role="option"]')!.addEventListener("click", () => {
        input.value = "EUR";
      });
    });
    await fillAutocomplete(input);
    expect(input.value).toBe("EUR");
    expect(leftover.dataset.picked).toBeUndefined();
  });
});

describe("fillRadio", () => {
  it("checks the matching option by value (positive)", () => {
    document.body.innerHTML = `
      <div role="radiogroup">
        <label><input id="yes" type="radio" name="gov" value="Yes" />YES</label>
        <label><input id="no" type="radio" name="gov" value="No" />NO</label>
      </div>
    `;
    const yes = document.getElementById("yes") as HTMLInputElement;
    expect(fillRadio(yes, "No")).toBe(true);
    expect((document.getElementById("no") as HTMLInputElement).checked).toBe(
      true,
    );
    expect(yes.checked).toBe(false);
  });

  it("returns false when every option is disabled (negative)", () => {
    document.body.innerHTML = `
      <div role="radiogroup">
        <label><input id="yes" type="radio" name="gov" value="Yes" disabled />YES</label>
        <label><input id="no" type="radio" name="gov" value="No" disabled />NO</label>
      </div>
    `;
    const yes = document.getElementById("yes") as HTMLInputElement;
    expect(fillRadio(yes)).toBe(false);
    expect(yes.checked).toBe(false);
  });

  it("picks a random radio when preferred is empty (positive)", () => {
    document.body.innerHTML = `
      <div role="radiogroup">
        <label><input id="a" type="radio" name="gov" value="A" />Alpha</label>
        <label><input id="b" type="radio" name="gov" value="B" />Bravo</label>
        <label><input id="c" type="radio" name="gov" value="C" />Charlie</label>
      </div>
    `;
    const random = vi.spyOn(Math, "random").mockReturnValue(0.9);
    const first = document.getElementById("a") as HTMLInputElement;

    expect(fillRadio(first, "")).toBe(true);
    random.mockRestore();
    expect((document.getElementById("c") as HTMLInputElement).checked).toBe(
      true,
    );
    expect(first.checked).toBe(false);
  });

  it("picks an enabled option when preferred is empty (edge)", () => {
    document.body.innerHTML = `
      <div role="radiogroup">
        <label><input id="yes" type="radio" name="gov" value="Yes" disabled />YES</label>
        <label><input id="no" type="radio" name="gov" value="No" />NO</label>
      </div>
    `;
    const yes = document.getElementById("yes") as HTMLInputElement;
    expect(fillRadio(yes, "")).toBe(true);
    expect((document.getElementById("no") as HTMLInputElement).checked).toBe(
      true,
    );
  });
});
