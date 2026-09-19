import {
  cancelElementPicker,
  isPickerActive,
  startElementPicker,
} from "./element-picker";

function click(el: Element): void {
  el.dispatchEvent(
    new MouseEvent("click", { bubbles: true, cancelable: true }),
  );
}

describe("startElementPicker control mode", () => {
  afterEach(() => {
    cancelElementPicker();
    document.body.innerHTML = "";
    document.getElementById("form-autofill-pick-highlight")?.remove();
    document.getElementById("form-autofill-pick-banner")?.remove();
    document.getElementById("form-autofill-toast")?.remove();
  });

  it("resolves the clicked input (positive)", async () => {
    document.body.innerHTML = `
      <label>Company Name<input id="company" /></label>
    `;
    const pending = startElementPicker({
      mode: "control",
      announceScan: false,
    });
    expect(isPickerActive()).toBe(true);
    click(document.getElementById("company")!);
    const result = await pending;
    expect(result?.element).toBe(document.getElementById("company"));
    expect(result?.fields[0]?.label).toBe("Company Name");
    expect(isPickerActive()).toBe(false);
  });

  it("stays in pick mode when the click is not a field (negative)", async () => {
    document.body.innerHTML = `
      <div id="empty">padding</div>
      <input id="company" />
    `;
    const pending = startElementPicker({ mode: "control", announceScan: false });
    click(document.getElementById("empty")!);
    expect(isPickerActive()).toBe(true);
    expect(document.getElementById("form-autofill-toast")?.textContent).toMatch(
      /input, textarea, or select/i,
    );
    cancelElementPicker();
    expect(await pending).toBeNull();
  });

  it("cancels on Escape (edge)", async () => {
    document.body.innerHTML = `<input id="company" />`;
    const pending = startElementPicker({ mode: "control", announceScan: false });
    document.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
        cancelable: true,
      }),
    );
    expect(await pending).toBeNull();
    expect(isPickerActive()).toBe(false);
  });
});
