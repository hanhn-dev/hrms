import {
  endFillSession,
  isFillSessionActive,
  startFillSession,
} from "./fill-session";

describe("fill session", () => {
  it("injects picker-hiding CSS once (positive)", () => {
    startFillSession();
    startFillSession();
    expect(isFillSessionActive()).toBe(true);
    expect(document.querySelectorAll("#form-autofill-fill-session")).toHaveLength(
      1,
    );
    const css = document.getElementById("form-autofill-fill-session")!.textContent ?? "";
    expect(css).toMatch(/MuiAutocomplete-popper/);
    expect(css).toMatch(/MuiPickersPopper-root/);
    expect(css).toMatch(/save-in-progress-overlay/);
    expect(css).not.toMatch(/MuiDialog-root/);
    expect(css).not.toMatch(/MuiModal-root/);
    endFillSession();
    expect(isFillSessionActive()).toBe(false);
  });

  it("does not insert a covering overlay on the page (negative)", () => {
    startFillSession();
    expect(document.getElementById("form-autofill-fill-overlay")).toBeNull();
    expect(document.querySelector("[aria-label='Filling form fields']")).toBeNull();
    endFillSession();
  });

  it("hides an existing My Details save overlay (edge)", () => {
    document.body.innerHTML = `<div data-testid="save-in-progress-overlay"></div>`;
    startFillSession();
    const overlay = document.querySelector(
      '[data-testid="save-in-progress-overlay"]',
    ) as HTMLElement;
    expect(overlay).toBeTruthy();
    expect(
      document.getElementById("form-autofill-fill-session")!.textContent,
    ).toContain("save-in-progress-overlay");
    endFillSession();
    document.body.innerHTML = "";
  });

  it("endFillSession is safe when nothing was started (edge)", () => {
    endFillSession();
    expect(isFillSessionActive()).toBe(false);
  });
});
